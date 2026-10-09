import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const requestPath=process.env.S6_REQUEST||process.argv[2]||'artifacts/orbit360-recovery/release-control/PILOTV6_S6_CT02_20261008_01_REQUEST.json';
const outPath=process.env.S6_OUT||process.argv[3]||'/tmp/gravicentra-pilot-s6-fixture.json';
const request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const mode=String(request.mode||'create').trim().toLowerCase();
const scenarioId=String(request.scenarioId||'PILOTV6_S6_CT02_20261008_01').trim();
const previewUrl=String(request.previewUrl||'').replace(/\/$/,'');
const slug=scenarioId.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const ids={
  client:'b3004human_'+slug+'_client',
  policy:'b3004human_'+slug+'_policy',
  receipt:'b3004human_'+slug+'_receipt',
  portfolio:'b3004human_'+slug+'_portfolio'
};
const sha=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app);
const tenant=db.collection('tenants').doc(tenantId);
const root=tenant.collection('data');
const refs={
  client:root.doc('clientes').collection('items').doc(ids.client),
  policy:root.doc('polizas').collection('items').doc(ids.policy),
  receipt:root.doc('recibosEsperados').collection('items').doc(ids.receipt),
  portfolio:root.doc('carteraPrimas').collection('items').doc(ids.portfolio)
};
const common={
  pais:'GT',
  __syntheticHumanQa:true,
  __syntheticGate:'B3-004-R12',
  __pilotFixture:true,
  __pilotScenario:scenarioId,
  __pilotParticipant:'CT02',
  __pilotRole:'Operativo'
};
async function chooseAdvisor(){
  const snap=await tenant.collection('members').get();
  const rows=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).filter(m=>m.active!==false&&m.activo!==false);
  const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');
  const assigned=m=>[].concat(m.roles||m.assignedRoles||m.rolesAsignados||[],m.activeRole||m.rolActivo||m.defaultRole||m.rolDefault||m.rol||[]).map(norm);
  const preferred=rows.find(m=>assigned(m).includes('operativo')&&String(m.asesorId||m.advisorId||'').trim());
  const any=preferred||rows.find(m=>String(m.asesorId||m.advisorId||'').trim());
  return any?String(any.asesorId||any.advisorId||'').trim():'';
}
async function deleteQuery(q,batch){
  const s=await q.get();
  s.docs.forEach(d=>batch.delete(d.ref));
  return s.size;
}
async function cleanup(){
  const batch=db.batch();
  const cobros=await root.doc('cobros').collection('items').where('reciboId','==',ids.receipt).get();
  cobros.docs.forEach(d=>batch.delete(d.ref));
  const reqs=await tenant.collection('reconciliationRequests').where('result.receiptId','==',ids.receipt).get().catch(()=>({docs:[],size:0}));
  (reqs.docs||[]).forEach(d=>batch.delete(d.ref));
  const events=await tenant.collection('reconciliationEvents').where('receiptId','==',ids.receipt).get().catch(()=>({docs:[],size:0}));
  (events.docs||[]).forEach(d=>batch.delete(d.ref));
  const opReqs=await tenant.collection('operationalRequests').where('result.receiptId','==',ids.receipt).get().catch(()=>({docs:[],size:0}));
  (opReqs.docs||[]).forEach(d=>batch.delete(d.ref));
  const opEvents=await tenant.collection('operationalEvents').where('receiptId','==',ids.receipt).get().catch(()=>({docs:[],size:0}));
  (opEvents.docs||[]).forEach(d=>batch.delete(d.ref));
  Object.values(refs).forEach(r=>batch.delete(r));
  await batch.commit();
  const verify=await Promise.all([
    refs.client.get(),refs.policy.get(),refs.receipt.get(),refs.portfolio.get(),
    root.doc('cobros').collection('items').where('reciboId','==',ids.receipt).get()
  ]);
  const residual=[verify[0].exists,verify[1].exists,verify[2].exists,verify[3].exists,verify[4].size].some(Boolean);
  if(residual) throw new Error('PILOT_S6_CLEANUP_RESIDUAL');
  return {deletedCobros:cobros.size,deletedReconciliationRequests:reqs.size||0,deletedReconciliationEvents:events.size||0,deletedOperationalRequests:opReqs.size||0,deletedOperationalEvents:opEvents.size||0};
}
async function create(){
  await cleanup();
  const advisorId=await chooseAdvisor();
  const batch=db.batch();
  const amount=123.45;
  batch.set(refs.client,{...common,id:ids.client,nombre:'PILOTO S6 CT02 · NO ES CLIENTE REAL',tipoPersona:'Persona',estado:'Activo',segmento:'Piloto',asesorId:advisorId});
  batch.set(refs.policy,{...common,id:ids.policy,clienteId:ids.client,numero:'PILOTV6-S6-CT02-20261008-01',aseguradoraId:'gt-aseguradora-guatemalteca',ramo:'AUTOMOVILES',producto:'PILOTO CONTROLADO',moneda:'GTQ',estado:'Vigente',vigenciaInicio:'2026-10-01',vigenciaFin:'2027-09-30',primaTotal:amount,cuotas:1,formaPago:'Pago único',asesorId:advisorId});
  batch.set(refs.receipt,{...common,id:ids.receipt,polizaId:ids.policy,clienteId:ids.client,asesorId,moneda:'GTQ',cuota:'1/1',serie:'PILOT-S6-1',fechaLimite:'2026-10-31',vence:'2026-10-31',monto:amount,primaTotal:amount,estado:'Pendiente',estadoOperativo:'pendiente_vence_corte',conciliado:false});
  batch.set(refs.portfolio,{...common,id:ids.portfolio,reciboId:ids.receipt,polizaId:ids.policy,clienteId:ids.client,asesorId,moneda:'GTQ',monto:amount,fechaLimite:'2026-10-31',estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true});
  await batch.commit();
  const verify=await Promise.all([refs.client.get(),refs.policy.get(),refs.receipt.get(),refs.portfolio.get()]);
  if(!verify.every(x=>x.exists)) throw new Error('PILOT_S6_FIXTURE_READBACK_FAIL');
  const out={
    schema:'GRAVICENTRA_PILOT_V6_S6_FIXTURE_V1',
    status:'READY',
    mode:'create',
    scenarioId,tenantId,projectId,previewUrl,
    ids,amount,currency:'GTQ',
    synthetic:true,realCustomer:false,cleanupRequired:true,
    exactPreviewBinding:{
      sourceSha:String(request.sourceSha||''),
      buildId:String(request.buildId||''),
      runId:Number(request.runId||0)||null,
      artifactId:Number(request.artifactId||0)||null,
      previewUrl
    },
    urls:{
      client:previewUrl?previewUrl+'/#/cliente360?c='+encodeURIComponent(ids.client)+'&t=recibos&r='+encodeURIComponent(ids.receipt):'',
      receipts:previewUrl?previewUrl+'/#/cliente360?c='+encodeURIComponent(ids.client)+'&t=recibos':'',
      cobros:previewUrl?previewUrl+'/#/cobros?qaReceipt='+encodeURIComponent(ids.receipt):''
    },
    privacy:{pii:false,participant:'CT02',role:'Operativo'},
    integrity:{fixtureDigest:sha(JSON.stringify({scenarioId,ids,amount,previewUrl}))}
  };
  fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out));
}
if(projectId!=='ays-orbit-360-lab') throw new Error('PILOT_S6_PROJECT_NOT_LAB');
if(tenantId!=='alianzas-soluciones') throw new Error('PILOT_S6_TENANT_INVALID');
if(!/^PILOTV6_S6_CT02_/.test(scenarioId)) throw new Error('PILOT_S6_SCENARIO_INVALID');
if(mode==='cleanup'){
  const cleanupResult=await cleanup();
  const out={schema:'GRAVICENTRA_PILOT_V6_S6_FIXTURE_V1',status:'CLEANED',mode:'cleanup',scenarioId,tenantId,projectId,ids,cleanupResult,syntheticFinalAbsent:true};
  fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out));
}else if(mode==='create'){
  await create();
}else{
  throw new Error('PILOT_S6_MODE_INVALID');
}
