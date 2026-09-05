'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { resolveProductActiveRole } = require('./product-active-role-contract');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-ops-leads-product-domain-v3-i2';
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
const MANAGE_PERMISSIONS = new Set(['ops_manage','leads_manage','gestiones_manage','workflow_manage']);
const BUSINESS_MUTABLE_FIELDS = Object.freeze([
  'nombre','tipo','email','telefono','asesorId','clienteId','pais','moneda','canal','producto','ramo','aseguradoraId',
  'primaEst','prioridad','origen','proximoToque','descripcion','prob','cadenciaActiva','cadencia','nroCotizacion','decision',
  'bitacora','motivoPerdido','checklist','colLeads','notas','comentarios','vence','creado','actualizado','ultimoContacto'
]);
const MANAGEMENT_MUTABLE_FIELDS = Object.freeze([
  'lista','tipo','titulo','clienteId','polizaId','negocioId','asesorId','aseguradoraId','ramo','estado','prioridad','vence',
  'proximaAccion','checklist','nota','notas','origen','bitacora','comentarios','creado','actualizado','resultado'
]);
const BUSINESS_CREATE_EXTRA_FIELDS = Object.freeze(['prob','proximoToque','descripcion','cadenciaActiva','cadencia','nroCotizacion','decision','bitacora','motivoPerdido','checklist','colLeads','notas','comentarios','vence','creado','actualizado','ultimoContacto']);
const MANAGEMENT_CREATE_EXTRA_FIELDS = Object.freeze(['ramo','vence','proximaAccion','checklist','notas','bitacora','comentarios','creado','actualizado','resultado']);

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
function requestRef(t,r){return db.collection('tenants').doc(t).collection('workflowRequests').doc(r);}
function eventRef(t,e){return db.collection('tenants').doc(t).collection('workflowEvents').doc(e);}
function outboxRef(t,e){return db.collection('tenants').doc(t).collection('notificationOutbox').doc(e);}
function permissions(m){return unique([...(m.permissions||[]),...(m.permisosExtra||[]),...(m.extras||[])]).map(norm);}
function active(m){const s=norm(m&&(m.status||m.estado));return!!m&&m.active!==false&&m.activo!==false&&!['inactive','inactivo','blocked','bloqueado'].includes(s);}
function scope(m){const s=m.dataScopes||{};const x=norm(s.workflow||s.leads||s.gestiones||m.scopeDatos||m.dataScope);if(['propios','own'].includes(x))return'own';if(['equipo','team'].includes(x))return'team';if(['ninguno','none'].includes(x))return'none';return'all';}
function advisorAllowed(m,target){const sc=scope(m),own=text(m.advisorId||m.asesorId,180),t=text(target,180);if(sc==='none')return false;if(sc==='own')return!!own&&own===t;if(sc==='team'){const set=new Set(unique(m.teamAdvisorIds||m.asesoresEquipo||[]));if(own)set.add(own);return set.has(t);}return true;}
async function authorize(request,operation){if(!request.auth||!request.auth.uid)throw new HttpsError('unauthenticated','Se requiere sesión activa.');const tenantId=id(request.data&&request.data.tenantId,'tenantId');const snap=await memberRef(tenantId,request.auth.uid).get();const member=snap.exists?snap.data():null;if(!active(member))throw new HttpsError('permission-denied','Membresía inactiva.');let roleState;try{roleState=resolveProductActiveRole(member,request.data&&request.data.activeRole);}catch(error){throw new HttpsError('permission-denied',error&&error.code==='PRODUCT_ASSIGNED_ROLES_MISSING'?'La membresía no tiene roles asignados.':'El rol activo no está asignado.');}const pr=permissions(member);const can=ADMIN_ROLES.has(roleState.activeRole)||pr.some(p=>MANAGE_PERMISSIONS.has(p));if(!can&&!['update_business','transition_business','update_management','resolve_management'].includes(operation))throw new HttpsError('permission-denied','No tiene permiso para administrar este flujo.');return{tenantId,member,actor:{uid:request.auth.uid,advisorId:text(member.advisorId||member.asesorId,180),activeRole:roleState.activeRole,roles:roleState.assignedRoles}};}
function workflowConfig(raw){raw=raw||{};const stages={};const source=raw.stages&&typeof raw.stages==='object'?raw.stages:DEFAULT_STAGES;Object.entries(source).forEach(([key,s])=>{const k=norm(key);stages[k]={leads:s.leads!==false,ops:s.ops===true,opsList:text(s.opsList||s.listaOps,100),terminal:s.terminal===true,next:unique(s.next||s.siguientes||[]).map(norm)};});return{version:text(raw.version||VERSION,120),stages,notificationChannels:unique(raw.notificationChannels||['portal','in_app']),portalResponseEnabled:raw.portalResponseEnabled!==false,cadenceEnabled:raw.cadenceEnabled!==false};}
async function config(t){const s=await configRef(t).get();return workflowConfig(s.exists?s.data():{});}
function copyAllowed(target,input,fields){fields.forEach(k=>{if(input&&input[k]!==undefined)target[k]=stable(input[k]);});return target;}
function sanitizeBusiness(input,actor){const out={id:id(input.id||`neg_${Date.now().toString(36)}`,'businessId'),nombre:text(input.nombre||input.name,220),tipo:text(input.tipo||input.type,80),email:text(input.email||input.correo,320),telefono:text(input.telefono||input.phone,100),etapa:norm(input.etapa||input.stage||'nuevo'),asesorId:id(input.asesorId||input.advisorId||actor.advisorId,'advisorId'),clienteId:text(input.clienteId||input.clientId,180),pais:text(input.pais||input.country,8).toUpperCase(),moneda:text(input.moneda||input.currency,8).toUpperCase(),canal:text(input.canal||input.channel,100),producto:text(input.producto||input.product,180),ramo:text(input.ramo||input.line,140),aseguradoraId:text(input.aseguradoraId||input.insurerId,180),primaEst:Number(input.primaEst||input.estimatedPremium||0),prioridad:text(input.prioridad||input.priority||'Media',40),origen:text(input.origen||input.origin||'Plataforma',100),archivado:false};copyAllowed(out,input,BUSINESS_CREATE_EXTRA_FIELDS);return out;}
function sanitizeManagement(input,actor){const out={id:id(input.id||`ges_${Date.now().toString(36)}`,'managementId'),lista:text(input.lista||input.opsList||'Gestiones Admin',120),tipo:text(input.tipo||input.type||'Gestión',180),titulo:text(input.titulo||input.title||input.tipo||'Gestión',240),clienteId:text(input.clienteId||input.clientId,180),polizaId:text(input.polizaId||input.policyId,180),negocioId:text(input.negocioId||input.businessId,180),asesorId:id(input.asesorId||input.advisorId||actor.advisorId,'advisorId'),aseguradoraId:text(input.aseguradoraId||input.insurerId,180),estado:text(input.estado||input.status||'Pendiente',80),prioridad:text(input.prioridad||input.priority||'Media',40),origen:text(input.origen||input.origin||'Plataforma',100),nota:text(input.nota||input.note,3000),archivado:false};copyAllowed(out,input,MANAGEMENT_CREATE_EXTRA_FIELDS);return out;}
function requestId(t,op,entity,payload,supplied){const explicit=text(supplied,180);return explicit?id(explicit,'requestId'):`wf_${sha(JSON.stringify(stable({t,op,entity,payload}))).slice(0,28)}`;}
function reason(data){const out=text(data.reason||data.motivo,600);if(!out)throw new HttpsError('invalid-argument','El motivo es obligatorio.');return out;}
function deterministicClientId(tenantId,businessId){return`cli_${sha(`${tenantId}|business-client|${businessId}`).slice(0,24)}`;}
function deterministicActivityId(tenantId,businessId){return`act_${sha(`${tenantId}|business-issued|${businessId}`).slice(0,24)}`;}

async function execute(request){const d=request.data||{},operation=norm(d.operation);if(!OPERATIONS.has(operation))throw new HttpsError('invalid-argument','Operación no soportada.');const authz=await authorize(request,operation),cfg=await config(authz.tenantId),motivo=reason(d),payload=d.payload&&typeof d.payload==='object'?d.payload:{};const isBusiness=operation.includes('business'),entityType=isBusiness?'negocios':'gestiones';let entityId=text(d.entityId||payload.id,180),prepared=null;if(operation==='create_business')prepared=sanitizeBusiness(payload,authz.actor);if(operation==='create_management'||operation==='portal_request')prepared=sanitizeManagement(payload,authz.actor);if(prepared)entityId=prepared.id;entityId=id(entityId,isBusiness?'businessId':'managementId');const rid=requestId(authz.tenantId,operation,entityId,payload,d.requestId),req=requestRef(authz.tenantId,rid),eventId=`evt_${sha(`${authz.tenantId}|${rid}`).slice(0,28)}`,entity=dataRef(authz.tenantId,entityType,entityId);
return db.runTransaction(async tx=>{const priorReq=await tx.get(req);if(priorReq.exists&&priorReq.data().status==='committed')return Object.assign({reused:true},priorReq.data().result||{});const snap=await tx.get(entity),before=snap.exists?snap.data():null;if(prepared&&before)throw new HttpsError('already-exists','El registro ya existe.');if(!prepared&&!before)throw new HttpsError('not-found','El registro no existe.');let after=prepared?Object.assign({},prepared):Object.assign({},before);if(!advisorAllowed(authz.member,after.asesorId||payload.asesorId||payload.advisorId))throw new HttpsError('permission-denied','El asesor está fuera de su alcance activo.');
if(operation==='transition_business'){const from=norm(before.etapa),to=norm(payload.to||payload.etapa||payload.stage),stage=cfg.stages[from];if(!cfg.stages[to])throw new HttpsError('failed-precondition','La etapa destino no está configurada.');if(!stage||!stage.next.includes(to))throw new HttpsError('failed-precondition','Transición no permitida.');copyAllowed(after,payload,BUSINESS_MUTABLE_FIELDS.filter(k=>!['etapa','archivado'].includes(k)));after.etapa=to;after.prob=Number(payload.prob!=null?payload.prob:after.prob||0);after.opsVisible=cfg.stages[to].ops===true;after.opsList=cfg.stages[to].opsList||'';if(to==='propuesta'&&cfg.cadenceEnabled)after.cadenciaActiva=true;
if(to==='emitido'){const clientId=text(after.clienteId||after.clienteIdCreado,180)||deterministicClientId(authz.tenantId,entityId),clientRef=dataRef(authz.tenantId,'clientes',clientId),clientSnap=await tx.get(clientRef);if(!clientSnap.exists){tx.set(clientRef,{id:clientId,tenantId:authz.tenantId,tipo:after.tipo||'Persona',nombre:after.nombre,pais:after.pais,moneda:after.moneda,ciudad:'',departamento:'',direccion:'',identificacion:'',email:after.email||'',telefono:after.telefono||'',asesorId:after.asesorId,segmento:'Nuevo',canal:after.canal||'Leads',fechaAlta:new Date().toISOString().slice(0,10),etiquetas:['Nuevo'],notas:`Cliente creado desde el ciclo comercial (negocio ${entityId}).`,encuestasActivas:true,createdAt:now(),createdByUid:authz.actor.uid,updatedAt:now()},{merge:false});}const activityId=deterministicActivityId(authz.tenantId,entityId);tx.set(dataRef(authz.tenantId,'actividades',activityId),{id:activityId,tenantId:authz.tenantId,clienteId:clientId,asesorId:after.asesorId,tipo:'sistema',icon:'🏆',fecha:new Date().toISOString().slice(0,10),titulo:'Cliente creado al emitir',detalle:`Negocio ganado: ${after.producto||''}. Cadencia de encuestas de satisfacción activada.`,negocioId:entityId,createdAt:now(),createdByUid:authz.actor.uid},{merge:true});after.clienteIdCreado=clientId;after.clienteId=after.clienteId||clientId;}}
else if(operation==='update_business'){copyAllowed(after,payload,BUSINESS_MUTABLE_FIELDS);}
else if(operation==='archive_business')after.archivado=true;
else if(operation==='update_management'){copyAllowed(after,payload,MANAGEMENT_MUTABLE_FIELDS);}
else if(operation==='assign_management'){copyAllowed(after,payload,MANAGEMENT_MUTABLE_FIELDS.filter(k=>k!=='asesorId'));after.asesorId=id(payload.asesorId||payload.advisorId,'advisorId');}
else if(operation==='resolve_management'){copyAllowed(after,payload,MANAGEMENT_MUTABLE_FIELDS.filter(k=>k!=='estado'));after.estado='Resuelta';after.resultado=text(payload.resultado||payload.result||after.resultado,3000);after.resolvedAt=now();}
else if(operation==='reopen_management'){copyAllowed(after,payload,MANAGEMENT_MUTABLE_FIELDS.filter(k=>k!=='estado'));after.estado='Pendiente';after.reopenedAt=now();}
else if(operation==='archive_management')after.archivado=true;
if(!advisorAllowed(authz.member,after.asesorId||payload.asesorId||payload.advisorId))throw new HttpsError('permission-denied','El asesor está fuera de su alcance activo.');
after.tenantId=authz.tenantId;after.schemaVersion=VERSION;after.updatedAt=now();after.updatedByUid=authz.actor.uid;if(!before){after.createdAt=now();after.createdByUid=authz.actor.uid;}tx.set(entity,after,{merge:true});tx.set(eventRef(authz.tenantId,eventId),{schemaVersion:VERSION,tenantId:authz.tenantId,operation,entityType,entityId:entityId,requestId:rid,actor:authz.actor,reason:motivo,beforeDigest:before?digest(before):'',afterDigest:digest(after),createdAt:now()},{merge:false});const targets=[];if(after.asesorId)targets.push({type:'advisor',id:after.asesorId});if(cfg.portalResponseEnabled&&after.clienteId&&['resolve_management','create_management','portal_request','assign_management'].includes(operation))targets.push({type:'client',id:after.clienteId});if(targets.length)tx.set(outboxRef(authz.tenantId,eventId),{schemaVersion:VERSION,tenantId:authz.tenantId,eventId,operation,entityType,entityId,targets,channels:cfg.notificationChannels,status:'pending_provider',payload:{title:text(payload.notificationTitle||after.titulo||after.nombre||'Actualización',220),message:text(payload.notificationMessage||motivo,1200)},createdAt:now()},{merge:false});const result={ok:true,operation,entityType,entityId,requestId:rid,eventId,storageMode:'productCanonicalDataV1',writePath:'tenants/{tenant}/data/{collection}/items',projection:{leadsVisible:entityType==='negocios'?!!(cfg.stages[after.etapa]&&cfg.stages[after.etapa].leads):false,opsVisible:entityType==='gestiones'?!after.archivado:!!(cfg.stages[after.etapa]&&cfg.stages[after.etapa].ops),advisorVisible:!!after.asesorId,clientId:text(after.clienteIdCreado||after.clienteId)}};tx.set(req,{status:'committed',operation,entityType,entityId,eventId,result,committedAt:now()},{merge:true});return result;});}

exports.orbit360OpsLeadsCommand=onCall({region:REGION,cors:true,timeoutSeconds:60,memory:'256MiB'},execute);
exports.__opsLeadsProductDomain=Object.freeze({VERSION,DEFAULT_STAGES,OPERATIONS,storageMode:'productCanonicalDataV1'});
