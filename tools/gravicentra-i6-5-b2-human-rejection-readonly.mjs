import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT=process.env.PROJECT_ID||'ays-orbit-360-lab';
const TENANT=process.env.TENANT_HINT||'alianzas-soluciones';
const OUT=process.argv[2]||process.env.B2_HUMAN_READONLY_FILE||'/tmp/b2-human-rejection-readonly.json';
const TARGET_NAME='SILVIA VANESA HERNÁNDEZ CAJAS';
const TARGET_POLICY_NUMBERS=new Set(['3002600002453','91-8296354']);
const sha=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
const clean=v=>String(v??'').trim();
const sa=()=>JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
const col=(db,name)=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const rows=async(db,name)=>{const s=await col(db,name).get();return s.docs.map(d=>({id:d.id,...d.data()}));};
const hashId=v=>clean(v)?sha(clean(v)).slice(0,20):'';
const invalidValueFields=row=>Object.entries(row||{}).filter(([k,v])=>typeof v==='string'&&/^(undefined|null)$/i.test(v.trim())).map(([k])=>k);

let app;
try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b2-human-readonly-'+Date.now());
  const db=getFirestore(app);
  const [clients,policies,vehicles,receipts,portfolio]=await Promise.all([
    rows(db,'clientes'),rows(db,'polizas'),rows(db,'vehiculos'),rows(db,'recibosEsperados'),rows(db,'carteraPrimas')
  ]);
  const matchedClients=clients.filter(x=>norm(x.nombre||x.name)===norm(TARGET_NAME));
  if(matchedClients.length!==1)throw new Error('B2_HUMAN_CLIENT_CARDINALITY_'+matchedClients.length);
  const client=matchedClients[0],clientId=client.id;
  const clientPolicies=policies.filter(p=>clean(p.clienteId)===clientId||TARGET_POLICY_NUMBERS.has(clean(p.numero||p.numeroPoliza)));
  const policyById=new Map(policies.map(p=>[p.id,p]));
  const vehicleRows=vehicles.filter(v=>clean(v.clienteId)===clientId||clientPolicies.some(p=>p.id===clean(v.polizaId)));
  const relevantPolicyIds=new Set(clientPolicies.map(p=>p.id));
  const policyView=clientPolicies.map(p=>{
    const vs=vehicleRows.filter(v=>clean(v.polizaId)===p.id);
    const rs=receipts.filter(r=>clean(r.polizaId)===p.id);
    const cs=portfolio.filter(r=>clean(r.polizaId)===p.id);
    return{
      idHash:hashId(p.id),numero:clean(p.numero||p.numeroPoliza),estado:clean(p.estado),
      renovadaPorHash:hashId(p.renovadaPor),renuevaDeHash:hashId(p.renuevaDe),
      vehicleCount:vs.length,vehicleIdHashes:vs.map(v=>hashId(v.id)),
      receiptCount:rs.length,portfolioCount:cs.length,
      invalidValueFields:invalidValueFields(p)
    };
  }).sort((a,b)=>a.numero.localeCompare(b.numero));
  const vehicleView=vehicleRows.map(v=>{
    const p=policyById.get(clean(v.polizaId));
    return{
      idHash:hashId(v.id),marca:clean(v.marca),linea:clean(v.linea),anio:clean(v.anio),placaPresent:!!clean(v.placa),
      estado:clean(v.estado),clienteMatches:clean(v.clienteId)===clientId,polizaIdHash:hashId(v.polizaId),
      linkedPolicyNumber:p?clean(p.numero||p.numeroPoliza):'',linkedPolicyState:p?clean(p.estado):'',linkedPolicyExists:!!p,
      receiptCount:receipts.filter(r=>clean(r.polizaId)===clean(v.polizaId)).length,
      portfolioCount:portfolio.filter(r=>clean(r.polizaId)===clean(v.polizaId)).length,
      invalidValueFields:invalidValueFields(v)
    };
  });
  const active=policyView.filter(p=>/vigente|por renovar/i.test(p.estado));
  const targetActive=policyView.find(p=>p.numero==='3002600002453')||null;
  const targetLegacy=policyView.find(p=>p.numero==='91-8296354')||null;
  const kia=vehicleView.find(v=>/kia/i.test(v.marca)&&/forte/i.test(v.linea))||null;
  const observations=[];
  if(targetActive&&targetLegacy&&targetActive.idHash!==targetLegacy.idHash)observations.push('TWO_DISTINCT_POLICY_DOCUMENTS_FOR_REPORTED_NUMBERS');
  if(targetActive&&targetActive.vehicleCount===0)observations.push('ACTIVE_REPORTED_POLICY_HAS_NO_LINKED_VEHICLE');
  if(kia&&kia.linkedPolicyNumber==='91-8296354')observations.push('KIA_FORTE_LINKS_TO_REPORTED_CANCELLED_POLICY');
  if(kia&&kia.receiptCount===0)observations.push('KIA_LINKED_POLICY_HAS_NO_EXPECTED_RECEIPTS');
  if(vehicleView.some(v=>v.invalidValueFields.length))observations.push('VEHICLE_SOURCE_CONTAINS_LITERAL_INVALID_VALUE');
  const conclusion={
    duplicateMergeAuthorized:false,
    deleteAuthorized:false,
    observedDistinctPolicyRecords:!!(targetActive&&targetLegacy&&targetActive.idHash!==targetLegacy.idHash),
    activePolicyVehicleRelationIncomplete:!!(targetActive&&targetActive.vehicleCount===0),
    historicalVehicleLinkPresent:!!kia,
    classification:targetActive&&targetLegacy&&targetActive.idHash!==targetLegacy.idHash
      ? (targetActive.vehicleCount===0&&kia?'A_PLUS_C_DISTINCT_CONTRACT_RECORDS_AND_INCOMPLETE_ACTIVE_VEHICLE_LINK':'A_DISTINCT_CONTRACT_RECORDS')
      : 'REVIEW_REQUIRED_NO_AUTOMATIC_MERGE'
  };
  const out={
    schema:'GRAVICENTRA_I6_5_B2_HUMAN_REJECTION_READONLY_V1',
    project:PROJECT,tenant:TENANT,writeExecuted:false,queryMode:'READ_ONLY',
    client:{idHash:hashId(clientId),matchCount:matchedClients.length},
    policies:policyView,vehicles:vehicleView,
    aggregate:{activePolicyCount:active.length,relevantPolicyCount:policyView.length,vehicleCount:vehicleView.length,receiptCount:receipts.filter(r=>relevantPolicyIds.has(clean(r.polizaId))).length,portfolioCount:portfolio.filter(r=>relevantPolicyIds.has(clean(r.polizaId))).length},
    observations,conclusion
  };
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log('I65_B2_HUMAN_RELATIONSHIP_READONLY=PASS');
  console.log('I65_B2_HUMAN_RELATIONSHIP_CLASSIFICATION='+conclusion.classification);
}finally{
  if(app)await deleteApp(app).catch(()=>{});
}
