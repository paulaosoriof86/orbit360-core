import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT=process.env.PROJECT_ID||'ays-orbit-360-lab';
const TENANT=process.env.TENANT_HINT||'alianzas-soluciones';
const OUT=process.env.B2_R3_RELATION_AUDIT_OUT||process.argv[2]||'/tmp/b2-r3-relation-audit.json';

// Privacy-safe target discriminants. Values are SHA-256(normalized business identifiers),
// so the repository/log never contains the client's name, policy number, plate or internal Firestore IDs.
const TARGET_CLIENT_HASH='f1b00424856b4d5be2f0d2a25dce2df024729fdc2c4bde8b8fa1ac4d70cc020b';
const TARGET_POLICY_HASH='b237bdd02c77c2b9390eee2979ddbdf3161544762309dc9c8977270cb578b3dc';
const TARGET_PLATE_HASH='bb7a2be796b223a89e1a042530ffc62a3e054fac0c6dd1e328762416c24781fb';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
const hash=v=>crypto.createHash('sha256').update(norm(v),'utf8').digest('hex');
const idHash=v=>clean(v)?crypto.createHash('sha256').update(clean(v),'utf8').digest('hex').slice(0,24):'';
const col=(db,name)=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const rows=async(db,name)=>{const s=await col(db,name).get();return s.docs.map(d=>({id:d.id,...d.data()}));};
const first=(row,keys)=>{for(const k of keys){const v=row?.[k];if(v!==undefined&&v!==null&&clean(v)!=='')return v;}return '';};
const policyNumber=p=>first(p,['numero','numeroPoliza','poliza','numero_poliza']);
const policyStart=p=>first(p,['vigenciaInicio','inicioVigencia','fechaInicio','desde']);
const policyEnd=p=>first(p,['vigenciaFin','finVigencia','fechaFin','hasta']);
const plate=v=>first(v,['placa','placaNormalizada','placaFuente']);
const invalidPaths=(value,prefix='',out=[])=>{
  if(value===null||value===undefined)return out;
  if(typeof value==='string'){
    const s=value.trim();
    if(/^(undefined|null|\[object Object\])$/i.test(s))out.push(prefix||'$');
    return out;
  }
  if(Array.isArray(value)){value.forEach((x,i)=>invalidPaths(x,`${prefix}[${i}]`,out));return out;}
  if(typeof value==='object'){for(const [k,v] of Object.entries(value))invalidPaths(v,prefix?prefix+'.'+k:k,out);}
  return out;
};
const safeLineage=p=>({
  renuevaDeHash:idHash(first(p,['renuevaDe','renuevaDeId','polizaAnteriorId','previousPolicyId','sourcePolicyId'])),
  renovadaPorHash:idHash(first(p,['renovadaPor','renovadaPorId','polizaNuevaId','nextPolicyId','renewedById']))
});
const refFields=(row,known)=>{
  const out=[];
  const walk=(v,path='')=>{
    if(v===null||v===undefined)return;
    if(Array.isArray(v)){v.forEach((x,i)=>walk(x,`${path}[${i}]`));return;}
    if(typeof v==='object'){for(const [k,x] of Object.entries(v))walk(x,path?path+'.'+k:k);return;}
    const s=clean(v); if(known.has(s))out.push({path,valueHash:idHash(s)});
  };
  walk(row);
  return out;
};
const sa=()=>JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));

let app;
try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b2-r3-rel-'+Date.now());
  const db=getFirestore(app);
  const [clients,policies,vehicles,renewals,history,receipts,portfolio]=await Promise.all([
    rows(db,'clientes'),rows(db,'polizas'),rows(db,'vehiculos'),rows(db,'renovaciones'),
    rows(db,'historial'),rows(db,'recibosEsperados'),rows(db,'carteraPrimas')
  ]);

  const matchedClients=clients.filter(x=>hash(first(x,['nombre','name','razonSocial']))===TARGET_CLIENT_HASH);
  if(matchedClients.length!==1)throw new Error('R3_TARGET_CLIENT_CARDINALITY_'+matchedClients.length);
  const client=matchedClients[0], clientId=client.id;

  const exactPolicies=policies.filter(p=>hash(policyNumber(p))===TARGET_POLICY_HASH);
  const clientPolicies=policies.filter(p=>clean(p.clienteId)===clientId);
  const policyIds=new Set(clientPolicies.map(p=>p.id));
  exactPolicies.forEach(p=>policyIds.add(p.id));

  const clientVehicles=vehicles.filter(v=>clean(v.clienteId)===clientId||policyIds.has(clean(v.polizaId)));
  const policyById=new Map(policies.map(p=>[p.id,p]));
  const knownIds=new Set([clientId,...policyIds,...clientVehicles.map(v=>v.id)].filter(Boolean));

  const policyView=exactPolicies.map(p=>({
    idHash:idHash(p.id),
    clientIdHash:idHash(p.clienteId),
    clientMatches:clean(p.clienteId)===clientId,
    estado:clean(p.estado),
    vigenciaInicio:clean(policyStart(p)),
    vigenciaFin:clean(policyEnd(p)),
    ...safeLineage(p),
    directVehicleIdHashes:clientVehicles.filter(v=>clean(v.polizaId)===p.id).map(v=>idHash(v.id)).sort(),
    receiptCount:receipts.filter(r=>clean(r.polizaId)===p.id).length,
    portfolioCount:portfolio.filter(r=>clean(r.polizaId)===p.id).length,
    invalidValuePaths:invalidPaths(p)
  })).sort((a,b)=>a.vigenciaInicio.localeCompare(b.vigenciaInicio));

  const vehicleView=clientVehicles.map(v=>{
    const linked=policyById.get(clean(v.polizaId));
    return{
      idHash:idHash(v.id),
      clientIdHash:idHash(v.clienteId),
      clientMatches:clean(v.clienteId)===clientId,
      brand:clean(first(v,['marca','brand'])),
      model:clean(first(v,['linea','modelo','model'])),
      year:clean(first(v,['anio','anioModelo','modeloAnio'])),
      plateHash:plate(v)?hash(plate(v)):'',
      targetPlate:plate(v)?hash(plate(v))===TARGET_PLATE_HASH:false,
      directPolicyIdHash:idHash(v.polizaId),
      directPolicyExists:!!linked,
      directPolicySameCommercialNumber:linked?hash(policyNumber(linked))===TARGET_POLICY_HASH:false,
      linkedPolicyState:linked?clean(linked.estado):'',
      linkedPolicyStart:linked?clean(policyStart(linked)):'',
      linkedPolicyEnd:linked?clean(policyEnd(linked)):'',
      invalidValuePaths:invalidPaths(v)
    };
  }).sort((a,b)=>a.idHash.localeCompare(b.idHash));

  const plateGroups={};
  for(const v of vehicleView){if(!v.plateHash)continue;(plateGroups[v.plateHash]??=[]).push(v.idHash);}
  const samePlateDifferentIds=Object.entries(plateGroups).filter(([,ids])=>new Set(ids).size>1).map(([plateHash,ids])=>({plateHash,vehicleIdHashes:[...new Set(ids)].sort()}));

  const relatedRenewals=renewals.map(r=>({row:r,refs:refFields(r,knownIds)})).filter(x=>x.refs.length||hash(first(x.row,['numeroPoliza','numero','poliza']))===TARGET_POLICY_HASH).map(x=>({
    idHash:idHash(x.row.id),estado:clean(x.row.estado),fecha:clean(first(x.row,['fecha','createdAt','updatedAt','vigenciaInicio'])),refs:x.refs,
    invalidValuePaths:invalidPaths(x.row)
  }));

  const relatedHistory=history.map(r=>({row:r,refs:refFields(r,knownIds)})).filter(x=>x.refs.length||hash(first(x.row,['numeroPoliza','numero','poliza']))===TARGET_POLICY_HASH).slice(0,250).map(x=>({
    idHash:idHash(x.row.id),tipo:clean(first(x.row,['tipo','accion','evento','eventType'])),fecha:clean(first(x.row,['fecha','createdAt','updatedAt','timestamp'])),refs:x.refs
  }));

  const distinctPolicyIds=new Set(policyView.map(x=>x.idHash));
  const distinctVehicleIds=new Set(vehicleView.map(x=>x.idHash));
  const targetVehicle=vehicleView.filter(v=>v.targetPlate);
  const observations=[];
  if(exactPolicies.length>1)observations.push('SAME_COMMERCIAL_POLICY_NUMBER_HAS_MULTIPLE_PHYSICAL_DOCUMENTS');
  if(exactPolicies.length===1)observations.push('COMMERCIAL_POLICY_NUMBER_HAS_ONE_PHYSICAL_DOCUMENT_IN_CURRENT_COLLECTION');
  if(clientVehicles.length!==5)observations.push('PHYSICAL_CLIENT_VEHICLE_COUNT_DIFFERS_FROM_VISUAL_EXPECTATION');
  if(targetVehicle.length===1&&targetVehicle[0].directPolicySameCommercialNumber)observations.push('TARGET_PLATE_DIRECTLY_LINKS_TO_ONE_PHYSICAL_VERSION_OF_COMMERCIAL_POLICY');
  if(targetVehicle.length>1)observations.push('TARGET_PLATE_EXISTS_IN_MULTIPLE_PHYSICAL_VEHICLE_DOCUMENTS');
  if(samePlateDifferentIds.length)observations.push('AT_LEAST_ONE_PLATE_MAPS_TO_MULTIPLE_PHYSICAL_VEHICLE_IDS');
  if(vehicleView.some(v=>v.invalidValuePaths.length))observations.push('VEHICLE_SOURCE_CONTAINS_LITERAL_INVALID_VALUE');
  if(policyView.some(p=>p.directVehicleIdHashes.length===0))observations.push('AT_LEAST_ONE_POLICY_VERSION_HAS_NO_DIRECT_VEHICLE_LINK');

  const out={
    schema:'GRAVICENTRA_I6_5_B2_R3_RELATIONSHIP_READONLY_V1',
    status:'PASS_READ_ONLY_EVIDENCE',
    project:PROJECT,tenant:TENANT,writeExecuted:false,queryMode:'READ_ONLY',
    privacy:{rawClientIdEmitted:false,rawPolicyIdEmitted:false,rawVehicleIdEmitted:false,rawNameEmitted:false,rawPolicyNumberEmitted:false,rawPlateEmitted:false},
    client:{idHash:idHash(clientId),matchCount:matchedClients.length},
    targetCommercialPolicy:{physicalDocumentCount:exactPolicies.length,distinctPhysicalIdCount:distinctPolicyIds.size,versions:policyView},
    clientVehicles:{physicalDocumentCount:clientVehicles.length,distinctPhysicalIdCount:distinctVehicleIds.size,rows:vehicleView,samePlateDifferentIds},
    genealogy:{renewalRows:relatedRenewals,historyRows:relatedHistory,historyRowsTruncated:relatedHistory.length>=250},
    observations,
    classification:{
      automaticMergeAuthorized:false,deleteAuthorized:false,relationshipWriteAuthorized:false,
      sameCommercialNumberMultiplePhysicalIds:exactPolicies.length>1,
      sourceVehicleIdsUnique:distinctVehicleIds.size===clientVehicles.length,
      targetPlatePhysicalDocumentCount:targetVehicle.length,
      historicalRelationshipAmbiguity:exactPolicies.length>1||targetVehicle.length!==1||samePlateDifferentIds.length>0,
      requiresExplicitPhysicalIdContractBeforeAnyLinkWrite:true
    }
  };
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log('B2_R3_RELATIONSHIP_READONLY=PASS');
  console.log('B2_R3_POLICY_PHYSICAL_COUNT='+exactPolicies.length);
  console.log('B2_R3_CLIENT_VEHICLE_PHYSICAL_COUNT='+clientVehicles.length);
  console.log('B2_R3_TARGET_PLATE_PHYSICAL_COUNT='+targetVehicle.length);
  console.log('B2_R3_SAME_PLATE_MULTI_ID_GROUPS='+samePlateDifferentIds.length);
  console.log('B2_R3_OBSERVATIONS='+observations.join(','));
} finally {
  if(app)await deleteApp(app).catch(()=>{});
}
