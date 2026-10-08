'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { resolveProductActiveRole } = require('./product-active-role-contract');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const PREVIEW_REGION = 'us-east1';
const VERSION = 'orbit360-ops-leads-product-domain-v12-integrated-emission';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const DEFAULT_STAGES = Object.freeze({
  nuevo:{leads:true,ops:false,next:['contactado','cotizando','perdido']},
  contactado:{leads:true,ops:false,next:['cotizando','perdido']},
  cotizando:{leads:true,ops:true,opsList:'Cotizaciones',next:['propuesta','perdido']},
  propuesta:{leads:true,ops:false,next:['negociacion','inspeccion','emision','perdido']},
  negociacion:{leads:true,ops:false,next:['inspeccion','emision','perdido']},
  inspeccion:{leads:true,ops:true,opsList:'Inspecciones',next:['emision','perdido']},
  emision:{leads:true,ops:true,opsList:'Emisiones',next:['emitido','perdido']},
  emitido:{leads:true,ops:false,terminal:true,next:[]},
  perdido:{leads:true,ops:false,terminal:true,next:['contactado']}
});
const OPERATIONS = new Set(['create_business','transition_business','update_business','archive_business','create_management','update_management','assign_management','resolve_management','reopen_management','archive_management','portal_request']);
const ADMIN_ROLES = new Set(['superadmin','admintenant','direccion','admin','operativo']);
const SELF_SERVICE_ROLES = new Set(['asesor','asesora','asesor_sr','asesora_sr','asesor_jr','asesora_jr','comercial']);
const MANAGE_PERMISSIONS = new Set(['ops_manage','leads_manage','gestiones_manage','workflow_manage']);
const BUSINESS_MUTABLE_FIELDS = Object.freeze([
  'nombre','tipo','email','telefono','asesorId','clienteId','polizaId','vehiculoId','cancelacionId','pais','moneda','canal','producto','ramo','aseguradoraId',
  'emissionContract','primaEst','prioridad','origen','proximoToque','descripcion','prob','cadenciaActiva','cadencia','nroCotizacion','decision',
  'bitacora','motivoPerdido','checklist','colLeads','notas','comentarios','vence','creado','actualizado','ultimoContacto'
]);
const MANAGEMENT_MUTABLE_FIELDS = Object.freeze([
  'lista','tipo','titulo','clienteId','polizaId','negocioId','cancelacionId','asesorId','aseguradoraId','ramo','pais','moneda','producto','estado','prioridad','vence',
  'proximaAccion','checklist','nota','notas','origen','bitacora','comentarios','creado','actualizado','resultado',
  'adjuntos','documentoCargaPendiente','documentoCargaFallida'
]);
const BUSINESS_CREATE_EXTRA_FIELDS = Object.freeze(['polizaId','cancelacionId','prob','proximoToque','descripcion','cadenciaActiva','cadencia','nroCotizacion','decision','bitacora','motivoPerdido','checklist','colLeads','notas','comentarios','vence','creado','actualizado','ultimoContacto']);
const MANAGEMENT_CREATE_EXTRA_FIELDS = Object.freeze(['cancelacionId','ramo','pais','moneda','producto','vence','proximaAccion','checklist','notas','bitacora','comentarios','creado','actualizado','resultado','adjuntos','documentoCargaPendiente','documentoCargaFallida']);
const ISSUANCE_MANAGEMENT_FIELDS = Object.freeze(['workflowType','requestKey','operationId','issuanceMode','sourcePolicyId','renewalManagementId','pais','moneda','producto','acceptedOffer','acceptedConfirmed','emissionStage','requiereInspeccion','documentosCompletos','requiereValidacion','validacionAlertas','policyCreatedId','policyNumber','documentRef','resueltaAt','nuevaPolizaId','emisionGestionId']);
const RENEWAL_MANAGEMENT_FIELDS = Object.freeze(['workflowType','renewalAction','sourcePolicyId','acceptedConfirmed','clientApprovalAt','clientApprovalNote','quoteContext','directRenewalPolicyId','issuanceRequestId','nuevaPolizaId','emisionGestionId']);
const DELETE_AUDIT_FIELDS = Object.freeze(['deleted','eliminado','archivado','deletedAt','eliminadoAt','deleteReason','motivoEliminacion','deletedByRole','deletedByUid','deletedByEmail','estadoEliminacion','deletedParentCollection','deletedParentId']);

const text=(v,max=1000)=>String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
const norm=v=>text(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const unique=v=>Array.from(new Set([].concat(v||[]).map(x=>text(x,180)).filter(Boolean)));
const sha=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
const stable=v=>{if(v==null)return v;if(Array.isArray(v))return v.map(stable);if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;};
const digest=v=>sha(JSON.stringify(stable(v)));
const now=()=>FieldValue.serverTimestamp();
function id(v,label){const out=text(v,180);if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(out))throw new HttpsError('invalid-argument',`${label||'ID'} inválido.`);return out;}
function memberRef(t,u){return db.collection('tenants').doc(t).collection('members').doc(u);}
function dataRef(t,c,i){return db.collection('tenants').doc(t).collection('data').doc(c).collection('items').doc(i);}
function configRef(t){return db.collection('tenants').doc(t).collection('config').doc('workflow');}
function requestRef(t,r,preview){return db.collection('tenants').doc(t).collection(preview?'previewWorkflowRequests':'workflowRequests').doc(r);}
function eventRef(t,e,preview){return db.collection('tenants').doc(t).collection(preview?'previewWorkflowEvents':'workflowEvents').doc(e);}
function outboxRef(t,e,preview){return db.collection('tenants').doc(t).collection(preview?'previewNotificationOutbox':'notificationOutbox').doc(e);}
function permissions(m){return unique([...(m.permissions||[]),...(m.permisosExtra||[]),...(m.extras||[])]).map(norm);}
function active(m){const s=norm(m&&(m.status||m.estado));return!!m&&m.active!==false&&m.activo!==false&&!['inactive','inactivo','blocked','bloqueado'].includes(s);}
function scope(m,domain){const s=m.dataScopes||{};const raw=domain==='leads'?(s.leads||s.commercial||s.default):(s.ops||s.workflow||s.gestiones||s.default);const x=norm(raw||m.scopeDatos||m.dataScope);if(['propios','own'].includes(x))return'own';if(['equipo','team'].includes(x))return'team';if(['ninguno','none'].includes(x))return'none';if(domain==='leads'&&text(m.advisorId||m.asesorId,180))return'own';return'all';}
function advisorAllowed(m,target,domain){const sc=scope(m,domain),own=text(m.advisorId||m.asesorId,180),t=text(target,180);if(sc==='none')return false;if(sc==='own')return!!own&&own===t;if(sc==='team'){const set=new Set(unique(m.teamAdvisorIds||m.asesoresEquipo||[]));if(own)set.add(own);return set.has(t);}return true;}
function collaborationWriteDirection(before,payload){const prior=[].concat(before&&before.comentarios||[]),next=[].concat(payload&&payload.comentarios||[]);if(next.length<=prior.length)return'';const last=next[next.length-1]||{},direction=text(last.direction,40),eventId=text(last.eventId,180);if(!eventId||!['advisor','operations'].includes(direction))return'';const seen=new Set(prior.map(x=>text(x&&x.eventId,180)).filter(Boolean));return seen.has(eventId)?'':direction;}
function workflowAuthorizationDomain(authz,operation,entityType,before,payload,cfg){if(entityType!=='negocios')return'ops';const direction=collaborationWriteDirection(before,payload),stage=norm(before&&before.etapa),origin=norm(before&&before.origen),operationalContext=origin==='ops'||!!(cfg&&cfg.stages&&cfg.stages[stage]&&cfg.stages[stage].ops===true);if(operation==='update_business'&&direction==='advisor'&&operationalContext&&ADMIN_ROLES.has(authz.actor.activeRole))return'ops';return'leads';}
function canonicalizeCollaborationPayload(before,payload,actor){
 const prior=[].concat(before&&before.comentarios||[]),next=[].concat(payload&&payload.comentarios||[]);
 if(next.length<=prior.length)return payload;
 const last=next[next.length-1]||{},direction=text(last.direction,40),eventId=text(last.eventId,180),seen=new Set(prior.map(x=>text(x&&x.eventId,180)).filter(Boolean));
 if(!eventId||!['advisor','operations'].includes(direction)||seen.has(eventId))return payload;
 const serverTs=new Date().toISOString(),actorName=text(actor&&actor.name||actor&&actor.email||actor&&actor.uid||'Usuario',220);
 const comment=Object.assign({},last,{ts:serverTs,user:actorName,actorName,actorUid:text(actor&&actor.uid,180),sequence:prior.length+1});
 const out=Object.assign({},payload,{comentarios:prior.concat([comment])});
 const priorBits=[].concat(before&&before.bitacora||[]),nextBits=[].concat(payload&&payload.bitacora||[]);
 if(nextBits.length>priorBits.length){
  const bit=Object.assign({},nextBits[nextBits.length-1]||{},{ts:serverTs,user:actorName,actorName,actorUid:text(actor&&actor.uid,180),sequence:priorBits.length+1});
  out.bitacora=priorBits.concat([bit]);
 }
 return out;
}
async function authorize(request,operation){if(!request.auth||!request.auth.uid)throw new HttpsError('unauthenticated','Se requiere sesión activa.');const tenantId=id(request.data&&request.data.tenantId,'tenantId');const snap=await memberRef(tenantId,request.auth.uid).get();const member=snap.exists?snap.data():null;if(!active(member))throw new HttpsError('permission-denied','Membresía inactiva.');let roleState;try{roleState=resolveProductActiveRole(member,request.data&&request.data.activeRole);}catch(error){throw new HttpsError('permission-denied',error&&error.code==='PRODUCT_ASSIGNED_ROLES_MISSING'?'La membresía no tiene roles asignados.':'El rol activo no está asignado.');}const pr=permissions(member);const can=ADMIN_ROLES.has(roleState.activeRole)||pr.some(p=>MANAGE_PERMISSIONS.has(p)),selfService=SELF_SERVICE_ROLES.has(roleState.activeRole)&&['create_management','portal_request'].includes(operation);if(!can&&!selfService&&!['update_business','transition_business','update_management','resolve_management'].includes(operation))throw new HttpsError('permission-denied','No tiene permiso para administrar este flujo.');return{tenantId,member,actor:{uid:request.auth.uid,email:text(member.email||request.auth.token&&request.auth.token.email,320),name:text(member.nombre||member.displayName||member.name||member.email||request.auth.token&&request.auth.token.name||request.auth.token&&request.auth.token.email||request.auth.uid,220),advisorId:text(member.advisorId||member.asesorId,180),activeRole:roleState.activeRole,roles:roleState.assignedRoles}};}
function workflowConfig(raw){raw=raw||{};const stages={};const source=raw.stages&&typeof raw.stages==='object'?raw.stages:DEFAULT_STAGES;Object.entries(source).forEach(([key,s])=>{const k=norm(key);stages[k]={leads:s.leads!==false,ops:s.ops===true,opsList:text(s.opsList||s.listaOps,100),terminal:s.terminal===true,next:unique(s.next||s.siguientes||[]).map(norm)};});return{version:text(raw.version||VERSION,120),stages,notificationChannels:unique(raw.notificationChannels||['portal','in_app']),portalResponseEnabled:raw.portalResponseEnabled!==false,cadenceEnabled:raw.cadenceEnabled!==false};}
async function config(t){const s=await configRef(t).get();return workflowConfig(s.exists?s.data():{});}
function copyAllowed(target,input,fields){fields.forEach(k=>{if(input&&input[k]!==undefined)target[k]=stable(input[k]);});return target;}
function copyWorkflowManagementFields(target,input,before){
  const wt=text((before&&before.workflowType)||(input&&input.workflowType),80);
  if(wt==='issuance_request')copyAllowed(target,input,ISSUANCE_MANAGEMENT_FIELDS);
  if(['renewal_proposals','renewal_accepted'].includes(wt))copyAllowed(target,input,RENEWAL_MANAGEMENT_FIELDS);
  return target;
}
function sanitizeBusiness(input,actor){const out={id:id(input.id||`neg_${Date.now().toString(36)}`,'businessId'),nombre:text(input.nombre||input.name,220),tipo:text(input.tipo||input.type,80),email:text(input.email||input.correo,320),telefono:text(input.telefono||input.phone,100),etapa:norm(input.etapa||input.stage||'nuevo'),asesorId:id(input.asesorId||input.advisorId||actor.advisorId,'advisorId'),clienteId:text(input.clienteId||input.clientId,180),pais:text(input.pais||input.country,8).toUpperCase(),moneda:text(input.moneda||input.currency,8).toUpperCase(),canal:text(input.canal||input.channel,100),producto:text(input.producto||input.product,180),ramo:text(input.ramo||input.line,140),aseguradoraId:text(input.aseguradoraId||input.insurerId,180),primaEst:Number(input.primaEst||input.estimatedPremium||0),prioridad:text(input.prioridad||input.priority||'Media',40),origen:text(input.origen||input.origin||'Plataforma',100),archivado:false};copyAllowed(out,input,BUSINESS_CREATE_EXTRA_FIELDS);return out;}
function sanitizeManagement(input,actor){const out={id:id(input.id||`ges_${Date.now().toString(36)}`,'managementId'),lista:text(input.lista||input.opsList||'Gestiones Admin',120),tipo:text(input.tipo||input.type||'Gestión',180),titulo:text(input.titulo||input.title||input.tipo||'Gestión',240),clienteId:text(input.clienteId||input.clientId,180),polizaId:text(input.polizaId||input.policyId,180),negocioId:text(input.negocioId||input.businessId,180),asesorId:id(input.asesorId||input.advisorId||actor.advisorId,'advisorId'),aseguradoraId:text(input.aseguradoraId||input.insurerId,180),ramo:text(input.ramo||input.line,140),pais:text(input.pais||input.country,8).toUpperCase(),moneda:text(input.moneda||input.currency,8).toUpperCase(),producto:text(input.producto||input.product,180),estado:text(input.estado||input.status||'Pendiente',80),prioridad:text(input.prioridad||input.priority||'Media',40),origen:text(input.origen||input.origin||'Plataforma',100),nota:text(input.nota||input.note,3000),archivado:false};copyAllowed(out,input,MANAGEMENT_CREATE_EXTRA_FIELDS);const wt=text(input.workflowType,80);if(wt==='issuance_request')copyAllowed(out,input,ISSUANCE_MANAGEMENT_FIELDS);if(wt==='renewal_proposals'||wt==='renewal_accepted')copyAllowed(out,input,RENEWAL_MANAGEMENT_FIELDS);return out;}
async function enrichManagementContext(tenantId,row){if(!row)return row;let policy=null,client=null;if(row.polizaId){const s=await dataRef(tenantId,'polizas',row.polizaId).get();policy=s.exists?s.data():null;}if(!row.clienteId&&policy&&policy.clienteId)row.clienteId=text(policy.clienteId,180);if(row.clienteId){const s=await dataRef(tenantId,'clientes',row.clienteId).get();client=s.exists?s.data():null;}row.pais=text(row.pais||(policy&&policy.pais)||(client&&client.pais),8).toUpperCase();row.moneda=text(row.moneda||(policy&&policy.moneda)||(client&&client.moneda),8).toUpperCase();row.ramo=text(row.ramo||(policy&&policy.ramo),140);row.producto=text(row.producto||(policy&&(policy.producto||policy.subramo)),180);return row;}
function requestId(t,op,entity,payload,supplied){const explicit=text(supplied,180);return explicit?id(explicit,'requestId'):`wf_${sha(JSON.stringify(stable({t,op,entity,payload}))).slice(0,28)}`;}
function reason(data){const out=text(data.reason||data.motivo,600);if(!out)throw new HttpsError('invalid-argument','El motivo es obligatorio.');return out;}
function clientIdentity(row){const email=text(row&&row.email,320).toLowerCase(),phone=text(row&&row.telefono,80).replace(/\D/g,'');return{email,phone,key:email?'email:'+email:phone?'phone:'+phone:''};}
function deterministicClientId(tenantId,businessId,identityKey){return`cli_${sha(`${tenantId}|client|${identityKey||('business:'+businessId)}`).slice(0,24)}`;}
function deterministicPolicyId(tenantId,businessId){return`pol_${sha(`${tenantId}|business-policy|${businessId}`).slice(0,24)}`;}
function deterministicVehicleId(tenantId,businessId,plate){return`veh_${sha(`${tenantId}|business-vehicle|${norm(plate)||businessId}`).slice(0,24)}`;}
function deterministicActivityId(tenantId,businessId){return`act_${sha(`${tenantId}|business-issued|${businessId}`).slice(0,24)}`;}
function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(text(value,40));}

async function execute(request,previewOnly=false){const d=request.data||{},operation=norm(d.operation);if(!OPERATIONS.has(operation))throw new HttpsError('invalid-argument','Operación no soportada.');const authz=await authorize(request,operation),cfg=await config(authz.tenantId),motivo=reason(d);let payload=d.payload&&typeof d.payload==='object'?d.payload:{};const isBusiness=operation.includes('business'),entityType=isBusiness?'negocios':'gestiones';let entityId=text(d.entityId||payload.id,180),prepared=null;if(operation==='create_business')prepared=sanitizeBusiness(payload,authz.actor);if(operation==='create_management'||operation==='portal_request')prepared=sanitizeManagement(payload,authz.actor);if(prepared&&entityType==='gestiones')prepared=await enrichManagementContext(authz.tenantId,prepared);if(prepared)entityId=prepared.id;entityId=id(entityId,isBusiness?'businessId':'managementId');const entity=dataRef(authz.tenantId,entityType,entityId);if(previewOnly===true&&!['create_management','create_business','portal_request'].includes(operation)){const ps=await entity.get(),pr=ps.exists?ps.data():null;if(!pr||pr.previewWrite!==true)throw new HttpsError('permission-denied','PREVIEW_TEST_RECORD_ONLY: en Preview solo se modifican gestiones/negocios creados durante la prueba.');}const rid=requestId(authz.tenantId,operation,entityId,payload,d.requestId),req=requestRef(authz.tenantId,rid,previewOnly),eventId=`evt_${sha(`${authz.tenantId}|${rid}`).slice(0,28)}`;
const committed=await db.runTransaction(async tx=>{const priorReq=await tx.get(req);if(priorReq.exists&&priorReq.data().status==='committed')return Object.assign({reused:true},priorReq.data().result||{});const snap=await tx.get(entity),before=snap.exists?snap.data():null;if(prepared&&before)throw new HttpsError('already-exists','El registro ya existe.');if(!prepared&&!before)throw new HttpsError('not-found','El registro no existe.');let after=prepared?Object.assign({},prepared):Object.assign({},before);if(operation==='update_business')payload=canonicalizeCollaborationPayload(before,payload,authz.actor);const authorizationDomain=workflowAuthorizationDomain(authz,operation,entityType,before,payload,cfg);if(!advisorAllowed(authz.member,after.asesorId||payload.asesorId||payload.advisorId,authorizationDomain))throw new HttpsError('permission-denied','El asesor está fuera de su alcance activo.');
if(operation==='transition_business'){const from=norm(before.etapa),to=norm(payload.to||payload.etapa||payload.stage),stage=cfg.stages[from];if(!cfg.stages[to])throw new HttpsError('failed-precondition','La etapa destino no está configurada.');if(!stage||!stage.next.includes(to))throw new HttpsError('failed-precondition','Transición no permitida.');copyAllowed(after,payload,BUSINESS_MUTABLE_FIELDS.filter(k=>!['etapa','archivado'].includes(k)));after.etapa=to;after.prob=Number(payload.prob!=null?payload.prob:after.prob||0);after.opsVisible=cfg.stages[to].ops===true;after.opsList=cfg.stages[to].opsList||'';if(to==='propuesta'&&cfg.cadenceEnabled){after.cadenciaActiva=true;after.cadenciaPaso=Math.max(1,Number(after.cadenciaPaso)||1);if(!text(after.proximoToque,40))after.proximoToque=new Date(Date.now()+3*86400000).toISOString().slice(0,10);}
if(to==='emitido'){
  const emission=after.emissionContract&&typeof after.emissionContract==='object'?after.emissionContract:{},policyDraft=emission.policy&&typeof emission.policy==='object'?emission.policy:{},vehicleDraft=emission.vehicle&&typeof emission.vehicle==='object'?emission.vehicle:null;
  const identity=clientIdentity(after),explicitClientId=text(after.clienteId||after.clienteIdCreado,180),candidateIds=new Set();
  if(!explicitClientId){
    const clientParent=dataRef(authz.tenantId,'clientes','_').parent,queries=[];
    if(identity.key)queries.push(clientParent.where('identityKey','==',identity.key).limit(3));
    if(identity.email)queries.push(clientParent.where('email','==',identity.email).limit(3));
    if(identity.phone)queries.push(clientParent.where('telefono','==',identity.phone).limit(3));
    for(const query of queries){const matches=await tx.get(query);matches.docs.forEach(doc=>candidateIds.add(doc.id));}
    if(candidateIds.size>1)throw new HttpsError('failed-precondition','EMISSION_CLIENT_IDENTITY_AMBIGUOUS: existen varios clientes para el mismo contacto; selecciona el cliente correcto antes de emitir.');
  }
  const clientId=explicitClientId||Array.from(candidateIds)[0]||deterministicClientId(authz.tenantId,entityId,identity.key),clientRef=dataRef(authz.tenantId,'clientes',clientId),clientSnap=await tx.get(clientRef);
  const policyNumber=text(policyDraft.numero||policyDraft.policyNumber||after.numeroPoliza,180),coverageStart=text(policyDraft.vigenciaInicio||policyDraft.startDate,40),coverageEnd=text(policyDraft.vigenciaFin||policyDraft.endDate,40);
  const policyId=text(after.polizaId||policyDraft.id,180)||deterministicPolicyId(authz.tenantId,entityId),policyRef=dataRef(authz.tenantId,'polizas',policyId),policySnap=await tx.get(policyRef);
  if(!policySnap.exists&&(!policyNumber||!validDate(coverageStart)||!validDate(coverageEnd)))throw new HttpsError('failed-precondition','EMISSION_POLICY_DATA_REQUIRED: número de póliza y vigencias válidas son obligatorios.');
  if(coverageStart&&coverageEnd&&coverageStart>coverageEnd)throw new HttpsError('failed-precondition','EMISSION_POLICY_DATES_INVALID: la vigencia final no puede ser anterior a la inicial.');
  const existingPolicy=policySnap.exists?policySnap.data()||{}:null;
  if(existingPolicy&&text(existingPolicy.clienteId,180)&&text(existingPolicy.clienteId,180)!==clientId)throw new HttpsError('failed-precondition','EMISSION_POLICY_CLIENT_CONFLICT: la póliza ya pertenece a otro cliente.');
  if(existingPolicy&&text(existingPolicy.negocioId||existingPolicy.sourceBusinessId,180)&&text(existingPolicy.negocioId||existingPolicy.sourceBusinessId,180)!==entityId)throw new HttpsError('failed-precondition','EMISSION_POLICY_BUSINESS_CONFLICT: la póliza ya está vinculada a otra oportunidad.');
  let vehicleId='';
  if(vehicleDraft&&text(vehicleDraft.placa||vehicleDraft.plate,80)){
    vehicleId=text(vehicleDraft.id,180)||deterministicVehicleId(authz.tenantId,entityId,vehicleDraft.placa||vehicleDraft.plate);
    const vehicleRef=dataRef(authz.tenantId,'vehiculos',vehicleId),vehicleSnap=await tx.get(vehicleRef),existingVehicle=vehicleSnap.exists?vehicleSnap.data()||{}:null;
    if(existingVehicle&&text(existingVehicle.clienteId,180)&&text(existingVehicle.clienteId,180)!==clientId)throw new HttpsError('failed-precondition','EMISSION_VEHICLE_CLIENT_CONFLICT: el vehículo ya pertenece a otro cliente.');
    if(existingVehicle&&text(existingVehicle.polizaId,180)&&text(existingVehicle.polizaId,180)!==policyId)throw new HttpsError('failed-precondition','EMISSION_VEHICLE_POLICY_CONFLICT: el vehículo ya está vinculado a otra póliza.');
    if(!vehicleSnap.exists)tx.set(vehicleRef,{id:vehicleId,tenantId:authz.tenantId,clienteId:clientId,polizaId:policyId,negocioId:entityId,placa:text(vehicleDraft.placa||vehicleDraft.plate,80).toUpperCase(),marca:text(vehicleDraft.marca||vehicleDraft.make,120),modelo:text(vehicleDraft.modelo||vehicleDraft.model,120),anio:Number(vehicleDraft.anio||vehicleDraft.year)||null,pais:after.pais,createdAt:now(),createdByUid:authz.actor.uid,updatedAt:now()},{merge:false});
  }
  if(!clientSnap.exists)tx.set(clientRef,{id:clientId,tenantId:authz.tenantId,identityKey:identity.key,tipo:after.tipo||'Persona',nombre:after.nombre,pais:after.pais,moneda:after.moneda,ciudad:'',departamento:'',direccion:'',identificacion:'',email:identity.email||text(after.email,320),telefono:identity.phone||text(after.telefono,80),asesorId:after.asesorId,segmento:'Nuevo',canal:after.canal||'Leads',fechaAlta:new Date().toISOString().slice(0,10),etiquetas:['Nuevo'],notas:`Cliente creado desde el ciclo comercial (negocio ${entityId}).`,encuestasActivas:true,createdAt:now(),createdByUid:authz.actor.uid,updatedAt:now()},{merge:false});
  if(!policySnap.exists)tx.set(policyRef,{id:policyId,tenantId:authz.tenantId,numero:policyNumber,clienteId:clientId,asesorId:after.asesorId,aseguradoraId:after.aseguradoraId,ramo:after.ramo,producto:after.producto,pais:after.pais,moneda:after.moneda,estado:'Vigente',vigenciaInicio:coverageStart,vigenciaFin:coverageEnd,primaTotal:Number(policyDraft.primaTotal!=null?policyDraft.primaTotal:after.primaEst)||0,negocioId:entityId,sourceBusinessId:entityId,vehiculoId:vehicleId,origen:'Ciclo comercial',createdAt:now(),createdByUid:authz.actor.uid,updatedAt:now()},{merge:false});
  else tx.set(policyRef,{negocioId:entityId,sourceBusinessId:entityId,vehiculoId:vehicleId||text(existingPolicy.vehiculoId,180),updatedAt:now(),updatedByUid:authz.actor.uid},{merge:true});
  const activityId=deterministicActivityId(authz.tenantId,entityId);tx.set(dataRef(authz.tenantId,'actividades',activityId),{id:activityId,tenantId:authz.tenantId,clienteId:clientId,polizaId:policyId,vehiculoId:vehicleId,asesorId:after.asesorId,tipo:'sistema',icon:'🏆',fecha:new Date().toISOString().slice(0,10),titulo:'Emisión integrada confirmada',detalle:`Negocio ganado: ${after.producto||''}. Cliente y póliza vinculados en una sola transacción.`,negocioId:entityId,createdAt:now(),createdByUid:authz.actor.uid},{merge:true});
  after.clienteIdCreado=clientId;after.clienteId=clientId;after.polizaId=policyId;after.vehiculoId=vehicleId||text(existingPolicy&&existingPolicy.vehiculoId,180);
}}
else if(operation==='update_business'){copyAllowed(after,payload,BUSINESS_MUTABLE_FIELDS);}
else if(operation==='archive_business'){after.archivado=true;copyAllowed(after,payload,DELETE_AUDIT_FIELDS);}
else if(operation==='update_management'){copyAllowed(after,payload,MANAGEMENT_MUTABLE_FIELDS);copyWorkflowManagementFields(after,payload,before);}
else if(operation==='assign_management'){copyAllowed(after,payload,MANAGEMENT_MUTABLE_FIELDS.filter(k=>k!=='asesorId'));copyWorkflowManagementFields(after,payload,before);after.asesorId=id(payload.asesorId||payload.advisorId,'advisorId');}
else if(operation==='resolve_management'){copyAllowed(after,payload,MANAGEMENT_MUTABLE_FIELDS.filter(k=>k!=='estado'));copyWorkflowManagementFields(after,payload,before);after.estado='Resuelta';after.resultado=text(payload.resultado||payload.result||after.resultado,3000);after.resolvedAt=now();}
else if(operation==='reopen_management'){copyAllowed(after,payload,MANAGEMENT_MUTABLE_FIELDS.filter(k=>k!=='estado'));copyWorkflowManagementFields(after,payload,before);after.estado='Pendiente';after.reopenedAt=now();}
else if(operation==='archive_management'){after.archivado=true;copyAllowed(after,payload,DELETE_AUDIT_FIELDS);}
if(!advisorAllowed(authz.member,after.asesorId||payload.asesorId||payload.advisorId,authorizationDomain))throw new HttpsError('permission-denied','El asesor está fuera de su alcance activo.');
if(previewOnly===true){after.previewWrite=true;after.previewSource='hosting-preview-uat';after.previewWriteAt=now();}
after.tenantId=authz.tenantId;after.schemaVersion=VERSION;after.updatedAt=now();after.updatedByUid=authz.actor.uid;if(!before){after.createdAt=now();after.createdByUid=authz.actor.uid;}tx.set(entity,after,{merge:true});tx.set(eventRef(authz.tenantId,eventId,previewOnly),{schemaVersion:VERSION,tenantId:authz.tenantId,operation,entityType,entityId:entityId,requestId:rid,actor:authz.actor,reason:motivo,beforeDigest:before?digest(before):'',afterDigest:digest(after),previewWrite:previewOnly===true,createdAt:now()},{merge:false});const comments=[].concat(after.comentarios||[]),collab=comments.length?comments[comments.length-1]:null,collabDirection=text(collab&&collab.direction,40),targets=[];
    if(collabDirection==='advisor'&&after.asesorId)targets.push({type:'advisor',id:after.asesorId});
    else if(collabDirection==='operations')targets.push({type:'role',id:'operations'});
    else if(after.asesorId)targets.push({type:'advisor',id:after.asesorId});if(cfg.portalResponseEnabled&&after.clienteId&&['resolve_management','create_management','portal_request','assign_management'].includes(operation))targets.push({type:'client',id:after.clienteId});if(targets.length)tx.set(outboxRef(authz.tenantId,eventId,previewOnly),{schemaVersion:VERSION,tenantId:authz.tenantId,eventId,operation,entityType,entityId,targets,channels:cfg.notificationChannels,status:'pending_provider',previewWrite:previewOnly===true,actorUid:authz.actor.uid,actorName:authz.actor.name,direction:collabDirection,targetSurface:collabDirection==='advisor'?'leads':collabDirection==='operations'?'ops':'',payload:{title:text(payload.notificationTitle||(collabDirection?(text(collab&&collab.tipo,160)||'Colaboración comercial-operativa'):(after.titulo||after.nombre||'Actualización')),220),message:text(payload.notificationMessage||(collabDirection?(text(collab&&collab.texto,1200)||text(collab&&collab.txt,1200)||motivo):motivo),1200)},createdAt:now()},{merge:false});const result={ok:true,operation,entityType,entityId,requestId:rid,eventId,previewWrite:previewOnly===true,notificationSuppressed:false,notificationPreview:previewOnly===true,storageMode:'productCanonicalDataV1',writePath:'tenants/{tenant}/data/{collection}/items',projection:{leadsVisible:entityType==='negocios'?!!(cfg.stages[after.etapa]&&cfg.stages[after.etapa].leads):false,opsVisible:entityType==='gestiones'?!after.archivado:!!(cfg.stages[after.etapa]&&cfg.stages[after.etapa].ops),advisorVisible:!!after.asesorId,clientId:text(after.clienteIdCreado||after.clienteId),policyId:text(after.polizaId),vehicleId:text(after.vehiculoId)}};tx.set(req,{status:'committed',operation,entityType,entityId,eventId,result,committedAt:now()},{merge:true});return result;});const confirmed=await entity.get();if(!confirmed.exists)throw new HttpsError('internal','Canonical workflow readback missing.');const confirmedRow=confirmed.data()||{};const readAction=(operation==='create_management'||operation==='create_business'||operation==='portal_request')?'insert':'update';const response={canonicalReadback:true,canonicalReadbackCount:1,readback:[{collection:entityType,id:entityId,action:readAction,exists:true}],collaborationReadback:entityType==='negocios'?[].concat(confirmedRow.comentarios||[]).slice(-1)[0]||null:null};if(entityType==='gestiones'){const docKey=x=>{if(!x||typeof x!=='object')return text(x,1000);return text(x.documentRef||x.fileId||x.archivoRef||x.driveUrl||x.externalUrl||x.url,1000);};response.managementDocumentReadback={documentRefs:[].concat(confirmedRow.adjuntos||[]).map(docKey).filter(Boolean).sort(),documentoCargaPendiente:confirmedRow.documentoCargaPendiente===true,documentoCargaFallidaCount:[].concat(confirmedRow.documentoCargaFallida||[]).filter(Boolean).length};}if(operation==='transition_business'&&norm(confirmedRow.etapa)==='emitido'){
  const clientId=text(confirmedRow.clienteId,180),policyId=text(confirmedRow.polizaId,180),vehicleId=text(confirmedRow.vehiculoId,180);
  const [clientReadback,policyReadback,vehicleReadback]=await Promise.all([
    clientId?dataRef(authz.tenantId,'clientes',clientId).get():Promise.resolve(null),
    policyId?dataRef(authz.tenantId,'polizas',policyId).get():Promise.resolve(null),
    vehicleId?dataRef(authz.tenantId,'vehiculos',vehicleId).get():Promise.resolve(null)
  ]);
  if(!clientReadback||!clientReadback.exists||!policyReadback||!policyReadback.exists)throw new HttpsError('internal','EMISSION_INTEGRATED_READBACK_MISSING');
  response.emissionReadback={clientId,clientExists:true,policyId,policyExists:true,vehicleId,vehicleExists:vehicleId?!!(vehicleReadback&&vehicleReadback.exists):false,transactional:true};
}
if(['archive_business','archive_management'].includes(operation)){response.deleteAuditReadback={deleted:confirmedRow.deleted===true,eliminado:confirmedRow.eliminado===true,archivado:confirmedRow.archivado===true,deleteReason:text(confirmedRow.deleteReason||confirmedRow.motivoEliminacion,600),deletedAt:text(confirmedRow.deletedAt||confirmedRow.eliminadoAt,120),deletedByRole:text(confirmedRow.deletedByRole,120),estadoEliminacion:text(confirmedRow.estadoEliminacion,120)};}return Object.assign({},committed,response);}

const CADENCE_STEPS=Object.freeze([
 {label:'Día 3 · WhatsApp de seguimiento',nextDays:4},
 {label:'Día 7 · correo con propuesta si no responde WhatsApp',nextDays:7},
 {label:'Día 14 · WhatsApp de cierre',nextDays:null}
]);
function localDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function plusDays(dateText,days){const d=new Date(String(dateText||localDate())+'T12:00:00Z');return new Date(d.getTime()+Number(days||0)*86400000).toISOString().slice(0,10);}
async function runCadenceBusiness(tenantId,businessId,preview){
 const bRef=dataRef(tenantId,'negocios',businessId),today=localDate();
 return db.runTransaction(async tx=>{
  const snap=await tx.get(bRef);if(!snap.exists)return{ok:false,missing:true};
  const before=snap.data()||{};if(preview&&before.previewWrite!==true)throw new Error('R20_CADENCE_PREVIEW_SYNTHETIC_ONLY');
  if(before.archivado===true||before.cadenciaActiva!==true||!text(before.proximoToque,40)||text(before.proximoToque,40)>today)return{ok:true,due:false};
  const step=Math.max(1,Math.min(CADENCE_STEPS.length,Number(before.cadenciaPaso)||1)),def=CADENCE_STEPS[step-1];
  const taskId=(preview?'b4003qa_cad_':'cad_')+sha(tenantId+'|'+businessId+'|'+step).slice(0,24),taskRef=dataRef(tenantId,'gestiones',taskId);
  const eventId='evt_'+sha(tenantId+'|cadence|'+businessId+'|'+step).slice(0,28),eRef=eventRef(tenantId,eventId,preview),oRef=outboxRef(tenantId,eventId,preview);
  const taskSnap=await tx.get(taskRef);if(!taskSnap.exists)tx.set(taskRef,{id:taskId,tenantId,tipo:'Seguimiento de cadencia',titulo:def.label,negocioId:businessId,clienteId:text(before.clienteId,180),asesorId:text(before.asesorId,180),pais:text(before.pais,8),producto:text(before.producto,180),ramo:text(before.ramo,140),estado:'Pendiente',prioridad:'Media',vence:today,proximaAccion:def.label,origen:'Cadencia automática',previewWrite:preview===true,createdAt:now(),updatedAt:now()},{merge:false});
  const nextStep=step+1,next=nextStep<=CADENCE_STEPS.length?plusDays(today,def.nextDays):'';
  const bit=[].concat(before.bitacora||[]).concat([{ts:new Date().toISOString(),user:'Sistema',campo:'Cadencia',de:text(before.proximoToque,40),a:def.label,origen:'auto'}]).slice(-100);
  tx.set(bRef,{cadenciaPaso:nextStep,cadenciaUltimaAccionAt:now(),cadenciaUltimaAccion:def.label,proximoToque:next,cadenciaActiva:!!next,bitacora:bit,updatedAt:now()},{merge:true});
  tx.set(eRef,{schemaVersion:VERSION,tenantId,operation:'cadence_due',entityType:'negocios',entityId:businessId,requestId:'cadence_'+taskId,actor:{uid:'system',advisorId:text(before.asesorId,180),activeRole:'system'},reason:def.label,previewWrite:preview===true,createdAt:now()},{merge:false});
  tx.set(oRef,{schemaVersion:VERSION,tenantId,eventId,operation:'cadence_due',entityType:'negocios',entityId:businessId,targets:before.asesorId?[{type:'advisor',id:text(before.asesorId,180)}]:[{type:'role',id:'operations'}],channels:['in_app','topbar','tarea'],status:'pending_provider',previewWrite:preview===true,payload:{title:'Seguimiento de cadencia pendiente',message:def.label},createdAt:now()},{merge:false});
  return{ok:true,due:true,businessId,taskId,eventId,step,nextStep,nextDate:next,previewWrite:preview===true};
 });
}
async function cadenceSweep(){
 const tenants=await db.collection('tenants').get(),summary={tenants:0,due:0,errors:[]};
 for(const td of tenants.docs){summary.tenants++;try{const snap=await dataRef(td.id,'negocios','_').parent.where('cadenciaActiva','==',true).limit(500).get();for(const doc of snap.docs){const row=doc.data()||{};if(row.archivado===true||!text(row.proximoToque,40)||text(row.proximoToque,40)>localDate())continue;const out=await runCadenceBusiness(td.id,doc.id,false);if(out&&out.due)summary.due++;}}catch(error){summary.errors.push({tenantId:td.id,error:text(error&&error.message||error,500)});}}
 return summary;
}
async function cadencePreview(request){
 const authz=await authorize(request,'update_business'),businessId=id(request.data&&request.data.entityId,'businessId'),snap=await dataRef(authz.tenantId,'negocios',businessId).get();
 if(!snap.exists||snap.data().previewWrite!==true)throw new HttpsError('permission-denied','PREVIEW_TEST_RECORD_ONLY');
 if(!advisorAllowed(authz.member,snap.data().asesorId,'leads'))throw new HttpsError('permission-denied','El negocio está fuera de su alcance.');
 return runCadenceBusiness(authz.tenantId,businessId,true);
}

exports.orbit360OpsLeadsCommand=onCall({region:REGION,cors:true,timeoutSeconds:60,memory:'256MiB'},request=>execute(request,false));
exports.orbit360OpsLeadsCommandPreview=onCall({region:PREVIEW_REGION,cors:true,timeoutSeconds:60,memory:'256MiB'},request=>execute(request,true));
exports.orbit360RunOpsLeadsCadencePreview=onCall({region:PREVIEW_REGION,cors:true,timeoutSeconds:60,memory:'256MiB'},cadencePreview);
exports.orbit360OpsLeadsCadenceScheduler=onSchedule({region:REGION,schedule:'every 60 minutes',timeZone:'America/Guatemala',timeoutSeconds:300,memory:'256MiB'},cadenceSweep);
exports.__opsLeadsProductDomain=Object.freeze({VERSION,DEFAULT_STAGES,OPERATIONS,storageMode:'productCanonicalDataV1',authorize,advisorAllowed,dataRef,text,runCadenceBusiness,cadenceSweep});
