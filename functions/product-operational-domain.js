'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { resolveProductActiveRole } = require('./product-active-role-contract');
const { validarCambioParticipacion } = require('./goal-participation-contract');
const { projectInsurerActivity } = require('./b4-003-scoped-bootstrap-reader');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const PREVIEW_REGION = 'us-east1';
const VERSION = 'gravicentra-product-operational-domain-v7-r20-human-preview-uat';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const storage = getStorage(app);

const COLLECTION_MODULE = Object.freeze({
  clientes: 'cliente360',
  aseguradoras: 'aseguradoras',
  polizas: 'polizas',
  vehiculos: 'polizas',
  recibosEsperados: 'cobros',
  carteraPrimas: 'cobros',
  cobros: 'cobros',
  reclamos: 'siniestros',
  finmovs: 'conciliaciones',
  tareas: 'ops',
  cancelaciones: 'cancelaciones',
  comisiones: 'comisiones',
  actividades: 'cliente360',
  asesores: 'equipo',
  metas: 'equipo',
  auditoria: 'equipo',
  auditoriaAsegExterna: 'aseguradoras'
});
const ADMIN_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admintenant', 'admin_tenant', 'admin', 'operativo']);
const TEAM_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admintenant', 'admin_tenant', 'admin']);
const FINANCE_ROLES = new Set(['finanzas', 'finance']);
const INSERT_ONLY = new Set(['auditoria', 'auditoriaAsegExterna']);
const REMOVABLE = new Set(['aseguradoras']);
const SECRET_KEY = /^(?:password|pass|pwd|contrasena|contraseña|clave|secret|token|accessToken|refreshToken|privateKey|clientSecret|credentialValue|credential_value)$/i;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,255}$/;

const text = (value, max = 800) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const unique = values => Array.from(new Set([].concat(values || []).map(v => text(v, 180)).filter(Boolean)));
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const now = () => FieldValue.serverTimestamp();

function cleanId(value, label) {
  const out = text(value, 256);
  if (!ID_RE.test(out)) throw new HttpsError('invalid-argument', `${label || 'ID'} inválido.`);
  return out;
}
function permissionsOf(member) {
  return unique([...(member.permissions || []), ...(member.permisosExtra || []), ...(member.extras || [])]).map(norm);
}
function activeMember(member) {
  if (!member || member.active === false || member.activo === false || member.inactivo === true) return false;
  const states = [member.status, member.estado].map(norm).filter(Boolean);
  return states.length > 0 && states.every(status => status === 'active' || status === 'activo');
}
function containsSecret(value, path = '') {
  if (!value || typeof value !== 'object') return '';
  for (const key of Object.keys(value)) {
    const current = path ? `${path}.${key}` : key;
    if (SECRET_KEY.test(key) && value[key] !== null && value[key] !== undefined && text(value[key])) return current;
    if (value[key] && typeof value[key] === 'object') {
      const nested = containsSecret(value[key], current);
      if (nested) return nested;
    }
  }
  return '';
}
function canonicalRef(tenantId, collection, id) {
  return db.collection('tenants').doc(tenantId).collection('data').doc(collection).collection('items').doc(id);
}
function memberRef(tenantId, uid) {
  return db.collection('tenants').doc(tenantId).collection('members').doc(uid);
}
function requestRef(tenantId, requestId) {
  return db.collection('tenants').doc(tenantId).collection('operationalRequests').doc(requestId);
}
function eventRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('operationalEvents').doc(eventId);
}
function membershipScope(value) {
  const scope = norm(value);
  if (['propios','propio','own','mios'].includes(scope)) return 'propios';
  if (['equipo','team'].includes(scope)) return 'equipo';
  if (['todos','all','global'].includes(scope)) return 'todos';
  if (['ninguno','none','sin_acceso','sinacceso'].includes(scope)) return 'ninguno';
  return '';
}
function dataScopesForAdvisor(row) {
  row = row || {};
  const explicit = row.dataScopes;
  const modules = {};
  let explicitDefault = '';
  const legacyScopes = [];
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    explicitDefault = membershipScope(explicit.default || explicit['*']);
    const explicitModules = explicit.modules && typeof explicit.modules === 'object' && !Array.isArray(explicit.modules)
      ? explicit.modules
      : null;
    if (explicitModules) {
      for (const [key,value] of Object.entries(explicitModules)) {
        const scope = membershipScope(value), moduleKey = norm(key);
        if (scope && moduleKey) modules[moduleKey] = scope;
      }
    } else {
      for (const [key,value] of Object.entries(explicit)) {
        if (['default','*','modules'].includes(key)) continue;
        const scope = membershipScope(value), moduleKey = norm(key);
        if (scope && moduleKey) {
          modules[moduleKey] = scope;
          legacyScopes.push(scope);
        }
      }
    }
  }
  let scope = membershipScope(row.scopeDatos || row.dataScope) || explicitDefault;
  if (!scope && legacyScopes.length && legacyScopes.every(value => value === legacyScopes[0])) scope = legacyScopes[0];
  if (!scope) scope = 'propios';
  return { default: scope, modules };
}
function membershipPatchFromAdvisor(row, current) {
  const roles = unique(row.roles && row.roles.length ? row.roles : [row.rolDefault || row.rol]);
  const defaultRole = text(row.rolDefault || row.defaultRole || row.rol || roles[0], 100);
  const activeRole = roles.includes(text(current && current.activeRole, 100)) ? text(current.activeRole, 100) : defaultRole;
  return {
    tenantId: text(row.tenantId, 160),
    advisorId: text(row.id, 160),
    status: row.inactivo === true || row.activo === false || norm(row.estado) === 'inactivo' ? 'blocked' : 'active',
    roles,
    defaultRole,
    activeRole,
    countries: unique(row.paises && row.paises.length ? row.paises : [row.paisDefault || row.pais]).map(v => text(v, 8).toUpperCase()),
    dataScopes: dataScopesForAdvisor(row),
    modulesVisible: unique(
      (row.modulosOverride && row.modulosOverride.length ? row.modulosOverride : null) ||
      (row.modulesVisible && row.modulesVisible.length ? row.modulesVisible : null) ||
      (current && current.modulesVisible) ||
      []
    ),
    modulesExtra: unique(row.modulosExtra || row.modulesExtra),
    modulesRestricted: unique(row.modulosRestringidos || row.modulesRestricted),
    teamId: text(row.teamId || row.equipoId, 160),
    equipoId: text(row.teamId || row.equipoId, 160),
    roleVisibleAdvisorIds: row.roleVisibleAdvisorIds && typeof row.roleVisibleAdvisorIds === 'object' ? row.roleVisibleAdvisorIds : {},
    updatedAt: now(),
    schemaVersion: 'orbit360-tenant-membership-v2'
  };
}
function accessConfigRef(tenantId) { return db.collection('tenants').doc(tenantId).collection('config').doc('access'); }
function roleConfig(accessConfig, role) {
  const all = accessConfig && accessConfig.rolePermissions && typeof accessConfig.rolePermissions === 'object' ? accessConfig.rolePermissions : {};
  const key = Object.keys(all).find(k => norm(k) === norm(role));
  return key ? all[key] : null;
}
function matrixPermission(accessConfig, role, moduleKey, action) {
  const rc = roleConfig(accessConfig, role); if (!rc || typeof rc !== 'object') return null;
  const key = Object.keys(rc).find(k => norm(k) === norm(moduleKey)), cell = key ? rc[key] : null;
  return cell && cell[action] != null ? cell[action] === true : null;
}
function normalizedScope(value) { const s=norm(value); if(['own','propios','propio','mios'].includes(s))return'own'; if(['team','equipo'].includes(s))return'team'; if(['all','todos','todo','global'].includes(s))return'all'; if(['none','ninguno','sinacceso','sin_acceso'].includes(s))return'none'; return''; }
const MODULE_SCOPE_ALIASES=Object.freeze({cliente360:['cliente360','clientes'],clientes:['clientes','cliente360'],ops:['ops','gestiones'],gestiones:['gestiones','ops']});
function moduleScopeValue(modules,moduleKey){const source=modules&&typeof modules==='object'?modules:{},keys=MODULE_SCOPE_ALIASES[moduleKey]||[moduleKey];for(const key of keys){const found=Object.keys(source).find(k=>norm(k)===norm(key));if(found)return source[found];}return undefined;}
function roleScope(accessConfig,role){
  const rs=accessConfig&&accessConfig.roleScopes&&typeof accessConfig.roleScopes==='object'?accessConfig.roleScopes:{};
  const key=Object.keys(rs).find(k=>norm(k)===norm(role)),configured=key?normalizedScope(rs[key]):''; if(configured)return configured;
  const r=norm(role); if(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','finanzas','finance','operativo'].includes(r))return'all'; if(['marketing','asistente'].includes(r))return'team'; if(r.includes('asesor')||r==='comercial')return'own'; return'none';
}
function scopeRank(v){return{none:0,own:1,team:2,all:3}[v]||0;}
function effectiveScope(member,accessConfig,role,moduleKey){
  const ds=member&&member.dataScopes&&typeof member.dataScopes==='object'?member.dataScopes:{},mods=ds.modules&&typeof ds.modules==='object'?ds.modules:{};
  let requested=normalizedScope(moduleScopeValue(mods,moduleKey)); if(!requested)requested=normalizedScope(ds.default||member.scopeDatos||member.dataScope);
  const ceiling=roleScope(accessConfig,role); if(!requested)return ceiling; return scopeRank(requested)<=scopeRank(ceiling)?requested:ceiling;
}
function listHas(values,moduleKey){return unique(values).map(norm).includes(norm(moduleKey));}
function moduleVisibleForWrite(member,accessConfig,role,moduleKey){
  if(listHas(member&&(member.modulesRestricted||member.modulosRestringidos),moduleKey))return false;
  if(listHas(member&&(member.modulesExtra||member.modulosExtra),moduleKey))return true;
  const visible=matrixPermission(accessConfig,role,moduleKey,'ver'); return visible==null?true:visible;
}
function legacyWriteAllowed(member,role,moduleKey,collection){
  let allowed=ADMIN_ROLES.has(role); if(collection==='asesores'||collection==='metas'||collection==='auditoria')allowed=TEAM_ROLES.has(role); if(['cobros','comisiones','recibosEsperados','carteraPrimas'].includes(collection)&&FINANCE_ROLES.has(role))allowed=true;
  if(allowed)return true; const permissions=permissionsOf(member),keys=[`${moduleKey}_manage`,`${moduleKey}_edit`,`${moduleKey}_editar`,`${moduleKey}_create`,`${moduleKey}_crear`].map(norm); return permissions.some(p=>keys.includes(p));
}
function canWrite(member,accessConfig,role,moduleKey,collection){
  // Financial movements are never implicitly editable by the operational
  // roster, even when that role can edit unrelated Ops records.
  if(collection==='finmovs'&&(!TEAM_ROLES.has(norm(role))&&!FINANCE_ROLES.has(norm(role))))return false;
  if(!moduleVisibleForWrite(member,accessConfig,role,moduleKey))return false;
  const permissions=permissionsOf(member),extraKeys=[`${moduleKey}_manage`,`${moduleKey}_edit`,`${moduleKey}_editar`,`${moduleKey}_create`,`${moduleKey}_crear`].map(norm); if(permissions.some(p=>extraKeys.includes(p)))return true;
  const configured=matrixPermission(accessConfig,role,moduleKey,'editar'); return configured==null?legacyWriteAllowed(member,role,moduleKey,collection):configured;
}
// Server-side reads and writes fail closed when the country is absent or is
// awaiting classification. A missing membership country must never mean ALL.
function countryAllowed(member,row){
  const allowed=unique(member&&member.countries).map(v=>text(v,8).toUpperCase()).filter(v=>['GT','CO'].includes(v));
  const country=text(row&&(row.pais||row.country),8).toUpperCase();
  return allowed.length>0&&['GT','CO'].includes(country)&&allowed.includes(country);
}
// Aseguradoras are global by *advisor*, never by *country*. The generic
// unscoped shortcut previously allowed a CO-only administrator to edit a GT
// insurer (or an unclassified insurer) through the server callable.
function insurerCountryAllowed(member,row){
  const countries=unique([...(member&&member.countries||[]),...(member&&member.paises||[]),...(member&&member.paisesAutorizados||[])])
    .map(v=>text(v,8).toUpperCase());
  const country=text(row&&(row.pais||row.country),8).toUpperCase();
  return ['GT','CO'].includes(country)&&countries.includes(country);
}
function rowAdvisorId(collection,row){if(collection==='asesores')return text(row&&row.id,180);return text(row&&(row.asesorId||row.advisorId||row.ownerAdvisorId),180);}
const UNSCOPED_COLLECTIONS=new Set(['aseguradoras','auditoria','auditoriaAsegExterna']);
function withinScope(actor,collection,moduleKey,row){
  if(collection==='aseguradoras'&&!insurerCountryAllowed(actor.member,row))return false;
  if(UNSCOPED_COLLECTIONS.has(collection))return true; if(!countryAllowed(actor.member,row))return false;
  if(collection==='tareas'&&!rowAdvisorId(collection,row))return false;
  const scope=effectiveScope(actor.member,actor.accessConfig,actor.activeRole,moduleKey); if(scope==='none')return false; if(scope==='all')return true;
  if(collection==='finmovs')return false; // Reader requires finance + country + all-scope.
  const target=rowAdvisorId(collection,row); if(!target)return false; if(scope==='own')return target===text(actor.member.advisorId,180); if(scope==='team')return actor.teamAdvisorIds.has(target); return false;
}
async function authorizeRead(request, tenantId, collection) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  collection=text(collection,80);
  const moduleKey=COLLECTION_MODULE[collection];
  if(!moduleKey)throw new HttpsError('permission-denied','Colección fuera del contrato operativo.');
  const [snap,accessSnap]=await Promise.all([memberRef(tenantId,request.auth.uid).get(),accessConfigRef(tenantId).get()]);
  const member=snap.exists?snap.data():null;
  if(!activeMember(member)||text(member.tenantId,160)!==tenantId)throw new HttpsError('permission-denied','Membresía activa requerida.');
  let requestedRole;
  try{requestedRole=resolveProductActiveRole(member,request.data&&request.data.activeRole).activeRole;}
  catch(error){throw new HttpsError('permission-denied',error&&error.code==='PRODUCT_ASSIGNED_ROLES_MISSING'?'La membresía no tiene roles asignados.':'El rol activo no está asignado.');}
  const accessConfig=accessSnap.exists?accessSnap.data()||{}:{};
  if(!moduleVisibleForWrite(member,accessConfig,requestedRole,moduleKey))throw new HttpsError('permission-denied',`El rol activo no puede ver ${collection}.`);
  const own=text(member.advisorId,180),teamAdvisorIds=new Set(own?[own]:[]),roleMap=member.roleVisibleAdvisorIds&&typeof member.roleVisibleAdvisorIds==='object'?member.roleVisibleAdvisorIds:{};
  const roleMapKey=Object.keys(roleMap).find(k=>norm(k)===norm(requestedRole));
  if(roleMapKey!==undefined){
    if(!Array.isArray(roleMap[roleMapKey]))throw new HttpsError('permission-denied','Configuración de equipo por rol inválida.');
    unique(roleMap[roleMapKey]).forEach(id=>teamAdvisorIds.add(id));
  }else unique(member.teamAdvisorIds||member.asesoresEquipo||[]).forEach(id=>teamAdvisorIds.add(id));
  if(roleMapKey===undefined&&!UNSCOPED_COLLECTIONS.has(collection)&&effectiveScope(member,accessConfig,requestedRole,moduleKey)==='team'){
    const teamId=text(member.teamId||member.equipoId,160);
    if(teamId||own){
      const advisorSnap=await db.collection('tenants').doc(tenantId).collection('data').doc('asesores').collection('items').get();
      advisorSnap.docs.forEach(doc=>{const row=doc.data()||{},id=text(row.id||doc.id,180);if(teamId&&text(row.teamId||row.equipoId,160)===teamId)teamAdvisorIds.add(id);if(own&&text(row.supervisorId,180)===own)teamAdvisorIds.add(id);});
    }
  }
  return{uid:request.auth.uid,activeRole:requestedRole,member,accessConfig,teamAdvisorIds};
}

async function authorize(request, tenantId, mutations) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const [snap,accessSnap]=await Promise.all([memberRef(tenantId,request.auth.uid).get(),accessConfigRef(tenantId).get()]);
  const member=snap.exists?snap.data():null;
  if(!activeMember(member)||text(member.tenantId,160)!==tenantId)throw new HttpsError('permission-denied','Membresía activa requerida.');
  let requestedRole;
  try{requestedRole=resolveProductActiveRole(member,request.data&&request.data.activeRole).activeRole;}
  catch(error){throw new HttpsError('permission-denied',error&&error.code==='PRODUCT_ASSIGNED_ROLES_MISSING'?'La membresía no tiene roles asignados.':'El rol activo no está asignado.');}
  const accessConfig=accessSnap.exists?accessSnap.data()||{}:{}; let needsTeam=false;
  for(const mutation of mutations){
    const collection=text(mutation.collection,80),moduleKey=COLLECTION_MODULE[collection]; if(!moduleKey)throw new HttpsError('permission-denied','Colección fuera del contrato operativo.');
    if(!canWrite(member,accessConfig,requestedRole,moduleKey,collection))throw new HttpsError('permission-denied',`El rol activo no puede escribir ${collection}.`);
    if(!UNSCOPED_COLLECTIONS.has(collection)&&effectiveScope(member,accessConfig,requestedRole,moduleKey)==='team')needsTeam=true;
  }
  const own=text(member.advisorId,180),teamAdvisorIds=new Set(own?[own]:[]),roleMap=member.roleVisibleAdvisorIds&&typeof member.roleVisibleAdvisorIds==='object'?member.roleVisibleAdvisorIds:{};
  const roleMapKey=Object.keys(roleMap).find(k=>norm(k)===norm(requestedRole));
  if(roleMapKey!==undefined){
    if(!Array.isArray(roleMap[roleMapKey]))throw new HttpsError('permission-denied','Configuración de equipo por rol inválida.');
    unique(roleMap[roleMapKey]).forEach(id=>teamAdvisorIds.add(id));
  }else unique(member.teamAdvisorIds||member.asesoresEquipo||[]).forEach(id=>teamAdvisorIds.add(id));
  if(needsTeam&&roleMapKey===undefined){const teamId=text(member.teamId||member.equipoId,160); if(teamId||own){const advisorSnap=await db.collection('tenants').doc(tenantId).collection('data').doc('asesores').collection('items').get(); advisorSnap.docs.forEach(doc=>{const row=doc.data()||{},id=text(row.id||doc.id,180);if(teamId&&text(row.teamId||row.equipoId,160)===teamId)teamAdvisorIds.add(id);if(own&&text(row.supervisorId,180)===own)teamAdvisorIds.add(id);});}}
  return{uid:request.auth.uid,activeRole:requestedRole,member,accessConfig,teamAdvisorIds};
}

// A client-only claim is legitimate. A policy-linked claim must use the
// policy's canonical country/owner, even if the client's domicile changed.
// Read parents in the transaction's read phase; no client-provided metadata
// may replace those relationships or expand the actor's assigned scope.
async function readOperationalParents(tx,tenantId,mutation,before){
  if(mutation.action==='remove'||!['reclamos','tareas'].includes(mutation.collection))return null;
  const prospective=Object.assign({},before||{},mutation.payload||{});
  const policyId=text(prospective.polizaId||prospective.policyId,180);
  const clientId=text(prospective.clienteId||prospective.clientId,180);
  if(!policyId&&!clientId){
    if(mutation.collection==='reclamos')throw new HttpsError('failed-precondition','Reclamo sin cliente o póliza canónica.');
    return null; // Unlinked manual task: country+advisor are mandatory in withinScope.
  }
  const policySnap=policyId?await tx.get(canonicalRef(tenantId,'polizas',cleanId(policyId,'policyId'))):null;
  if(policyId&&!policySnap.exists)throw new HttpsError('failed-precondition','Póliza relacionada no encontrada.');
  const policy=policySnap&&policySnap.data()||null;
  const canonicalClientId=policy?text(policy.clienteId,180):clientId;
  if(!canonicalClientId||(clientId&&clientId!==canonicalClientId))throw new HttpsError('failed-precondition','Cliente y póliza relacionados no coinciden.');
  const clientSnap=await tx.get(canonicalRef(tenantId,'clientes',cleanId(canonicalClientId,'clienteId')));
  if(!clientSnap.exists)throw new HttpsError('failed-precondition','Cliente relacionado no encontrado.');
  const client=clientSnap.data()||{};
  if((policy&&policy.tenantId&&policy.tenantId!==tenantId)||(client.tenantId&&client.tenantId!==tenantId))throw new HttpsError('permission-denied','Relación fuera del tenant activo.');
  return{policy,client,canonicalClientId};
}
function verifiedOperationalParentScope(collection,prospective,parents){
  if(!parents)return;
  const canonical=parents.policy||parents.client;
  const parentCountry=text(canonical.pais||canonical.country,8).toUpperCase();
  const country=text(prospective.pais||prospective.country,8).toUpperCase();
  const parentAdvisor=text(canonical.asesorId||canonical.advisorId||canonical.ownerAdvisorId,180);
  const advisor=text(prospective.asesorId||prospective.advisorId||prospective.ownerAdvisorId,180);
  if(!['GT','CO'].includes(parentCountry)||country!==parentCountry||!parentAdvisor||advisor!==parentAdvisor)
    throw new HttpsError('failed-precondition',`Alcance de ${collection} no coincide con el registro canónico.`);
  const declaredClient=text(prospective.clienteId||prospective.clientId,180);
  if(declaredClient&&declaredClient!==parents.canonicalClientId)throw new HttpsError('failed-precondition','Cliente vinculado inconsistente.');
}
// Only executePreview can construct this context. The existing production
// command never gains a general right to delete goals or manufacture a QA run.
const META_QA_SESSION_SCHEMA = 'gravicentra-metas-preview-session-v1';
// Deliberately not a calendar month: every Inicio query validates YYYY-MM,
// so its existing raw institutional-goal projection can never count a fixture.
const META_QA_PERIOD = 'QA-B4-003';
const META_QA_ID = /^b4003qa_metas_([A-Za-z0-9_-]{8,64})_(prima|recaudo)$/;
function metaPreviewContextOf(input) {
  const q=input.metaPreviewQa||{},runId=text(q.runId,80),operation=text(q.operation,20),pais=text(q.pais,8),periodo=text(q.periodo,10);
  if(q.version!==1||!(operation==='inspect'&&!runId||/^[A-Za-z0-9_-]{8,64}$/.test(runId))||!['probe','inspect','write','restore'].includes(operation)||!['GT','CO'].includes(pais)||periodo!==META_QA_PERIOD)
    throw new HttpsError('invalid-argument','Contexto de prueba de metas inválido.');
  return {version:1,runId,operation,pais,periodo};
}
function metaPreviewContract(input, mutations, uid) {
  const context=metaPreviewContextOf(input),{runId,operation,pais,periodo}=context;
  if(!['write','restore'].includes(operation))throw new HttpsError('invalid-argument','Operación de prueba de metas inválida.');
  const goals=mutations.filter(m=>m&&m.collection==='metas'),audits=mutations.filter(m=>m&&m.collection==='auditoria');
  if(goals.length<1||goals.length>2||audits.length!==1||mutations.length!==goals.length+1)
    throw new HttpsError('invalid-argument','La prueba requiere metas y una auditoría en el mismo lote.');
  const ids=new Set();
  for(const m of goals){
    const id=text(m.id||(m.payload&&m.payload.id),256),match=META_QA_ID.exec(id);
    if(!match||match[1]!==runId||ids.has(id)||!(operation==='restore'?m.action==='remove':['insert','update'].includes(m.action)))
      throw new HttpsError('permission-denied','Registro fuera de la prueba de metas.');
    ids.add(id);
    if(operation==='write'){
      const p=m.payload||{};
      if(p.tipo!==match[2]||p.mes!==periodo||p.moneda!==(pais==='GT'?'GTQ':'COP')||!Number.isFinite(p.valor)||p.valor<0||text(p.asesorId||p.advisorId||p.ownerAdvisorId,180))
        throw new HttpsError('invalid-argument','Meta institucional sintética inválida.');
    }
  }
  const audit=audits[0],auditId=text(audit.id||(audit.payload&&audit.payload.id),256),auditPrefix='b4003qa_metas_'+runId+'_audit_';
  if(audit.action!=='insert'||!auditId.startsWith(auditPrefix)||!/^[A-Za-z0-9_-]{8,64}$/.test(auditId.slice(auditPrefix.length))||audit.payload?.modulo!=='equipo'||audit.payload?.accion!==(operation==='restore'?'restaurar_prueba_metas':'editar_meta_institucional'))
    throw new HttpsError('invalid-argument','Auditoría de prueba de metas inválida.');
  for(const m of mutations.filter(m=>m.action!=='remove')){
    const p=m.payload||{};
    if(p.__syntheticQa!==true||p.__metasPreviewQa!==true||p.__metasPreviewRunId!==runId||p.__metasPreviewActorUid!==uid||p.pais!==pais||p.periodo!==periodo)
      throw new HttpsError('permission-denied','La prueba requiere actor, país, período y marca sintética explícitos.');
    if(p.id!==undefined&&p.id!==m.id||p.tenantId!==undefined&&p.tenantId!==input.tenantId||p.__metasPreviewEvidence!==undefined)
      throw new HttpsError('invalid-argument','Identidad o evidencia canónica de prueba inválida.');
  }
  return Object.freeze(Object.assign(context,{goalIds:[...ids].sort(),auditId}));
}
const metaSessionRefFor=(tenantId,runId)=>requestRef(tenantId,'qa_metas_session_'+sha(tenantId+'|'+runId).slice(0,32));
const metaActorRefFor=(tenantId,uid,pais)=>requestRef(tenantId,'qa_metas_actor_'+sha(tenantId+'|'+uid+'|'+pais).slice(0,32));
function requireMetaPreviewActor(actor,context){
  if(!TEAM_ROLES.has(norm(actor.activeRole))||!countryAllowed(actor.member,{pais:context.pais})||effectiveScope(actor.member,actor.accessConfig,actor.activeRole,'equipo')!=='all')
    throw new HttpsError('permission-denied','Rol, país o alcance no autorizado para la prueba institucional.');
}
function requireMetaSessionIdentity(session,actor,context){
  if(session.schemaVersion!==META_QA_SESSION_SCHEMA||session.actorUid!==actor.uid||session.activeRole!==actor.activeRole||session.runId!==context.runId||session.pais!==context.pais||session.periodo!==context.periodo)
    throw new HttpsError('permission-denied','La prueba pertenece a otro actor o contexto.');
}
function metaFixtureFingerprint(row){
  if(!row)return null;
  // Server timestamps are the only fields materialized after transaction
  // evaluation. Every other field must still equal our last committed image.
  const copy=Object.assign({},row);delete copy.createdAt;delete copy.updatedAt;
  return digest(copy);
}
function metaFixtureImage(row){
  if(!row)return null;
  return Object.fromEntries(['id','tenantId','pais','mes','periodo','moneda','tipo','valor','__syntheticQa','__metasPreviewQa','__metasPreviewRunId','__metasPreviewActorUid'].map(k=>[k,row[k]??null]));
}
function metaFixtureMatches(row,known,actor,context,id,tenantId){
  return known&&known.originalExists===false&&row&&row.id===id&&row.tenantId===tenantId&&row.__syntheticQa===true&&row.__metasPreviewQa===true&&row.__metasPreviewActorUid===actor.uid&&row.__metasPreviewRunId===context.runId&&row.pais===context.pais&&row.periodo===context.periodo&&row.mes===META_QA_PERIOD&&metaFixtureFingerprint(row)===known.lastDigest;
}
function validateMetaPreviewSession(context, actor, existingSession, reads, tenantId){
  requireMetaPreviewActor(actor,context);
  const s=existingSession||{schemaVersion:META_QA_SESSION_SCHEMA,actorUid:actor.uid,activeRole:actor.activeRole,runId:context.runId,pais:context.pais,periodo:context.periodo,status:'active',fixtures:{}};
  requireMetaSessionIdentity(s,actor,context);
  if(s.status!=='active')throw new HttpsError('failed-precondition','La prueba ya fue restaurada.');
  const fixtures=Object.assign({},s.fixtures||{}),changes=[];
  if(context.operation==='restore'&&(!existingSession||JSON.stringify(Object.keys(fixtures).sort())!==JSON.stringify(context.goalIds)))
    throw new HttpsError('failed-precondition','La restauración debe incluir todos los registros de la prueba.');
  for(const {mutation,snap} of reads.filter(x=>x.mutation.collection==='metas')){
    const before=snap.exists?snap.data():null,known=fixtures[mutation.id];
    if(mutation.action==='insert'){
      if(before||known)throw new HttpsError('already-exists','El fixture debe partir de ausencia comprobada.');
    }else{
      if(!metaFixtureMatches(before,known,actor,context,mutation.id,tenantId))
        throw new HttpsError('failed-precondition','El registro cambió o no pertenece a esta prueba; restauración bloqueada.');
    }
    const after=mutation.action==='remove'?null:Object.assign({},before||{},mutation.payload,{id:mutation.id,tenantId,updatedByUid:actor.uid});
    if(after&&!before)after.createdByUid=actor.uid;
    if(after)fixtures[mutation.id]={originalExists:false,lastDigest:metaFixtureFingerprint(after)};
    changes.push({id:mutation.id,before:metaFixtureImage(before),after:metaFixtureImage(after),originalExists:false});
  }
  return {session:Object.assign({},s,{fixtures,status:context.operation==='restore'?'restored':'active'}),changes};
}
async function inspectMetaPreview(request){
  const input=request.data||{},context=metaPreviewContextOf(input),tenantId=cleanId(input.tenantId,'tenantId');
  if([].concat(input.mutations||[]).length)throw new HttpsError('invalid-argument','La consulta de prueba no admite escrituras.');
  const actor=await authorize(request,tenantId,[{collection:'metas'},{collection:'auditoria'}]);
  requireMetaPreviewActor(actor,context);
  const proof={version:1,contractVersion:META_QA_SESSION_SCHEMA,runId:context.runId||null,actorUid:actor.uid,activeRole:actor.activeRole,pais:context.pais,periodo:context.periodo,restoreSupported:true,status:'none',fixtureIds:[],fixtures:[]};
  if(context.operation==='probe')return{ok:true,serverOwned:true,readOnly:true,metaPreviewQa:proof};
  return db.runTransaction(async tx=>{
    const pointer=await tx.get(metaActorRefFor(tenantId,actor.uid,context.pais));
    const pointerRow=pointer.exists?pointer.data():null;
    const runId=context.runId||pointerRow&&text(pointerRow.runId,80);
    if(!runId)return{ok:true,serverOwned:true,readOnly:true,metaPreviewQa:proof};
    const sessionSnap=await tx.get(metaSessionRefFor(tenantId,runId));
    if(!sessionSnap.exists)throw new HttpsError('failed-precondition','No se encontró la sesión canónica de prueba.');
    const session=sessionSnap.data()||{},scope=Object.assign({},context,{runId});
    requireMetaSessionIdentity(session,actor,scope);
    const ids=Object.keys(session.fixtures||{}).sort(),fixtures=[];
    if(!['active','restored'].includes(session.status)||ids.length<1||ids.length>2||ids.some(id=>{const match=META_QA_ID.exec(id);return !match||match[1]!==runId;}))
      throw new HttpsError('failed-precondition','Sesión de prueba inconsistente.');
    for(const id of ids){
      const snap=await tx.get(canonicalRef(tenantId,'metas',id));
      if(session.status==='restored'){
        if(snap.exists)throw new HttpsError('failed-precondition','Un fixture restaurado reapareció.');
      }else{
        const row=snap.exists?snap.data():null;
        if(!metaFixtureMatches(row,session.fixtures[id],actor,scope,id,tenantId))throw new HttpsError('failed-precondition','El fixture cambió; revisión canónica requerida.');
        fixtures.push(row);
      }
    }
    return{ok:true,serverOwned:true,readOnly:true,metaPreviewQa:Object.assign(proof,{runId,status:session.status,fixtureIds:ids,fixtures,originalAbsenceVerified:true})};
  });
}

function normalizeMutation(raw, allowMetaFixtureRemove = false) {
  const mutation = raw || {};
  const action = norm(mutation.action);
  if (!['insert','update','remove'].includes(action)) throw new HttpsError('invalid-argument', 'Acción operativa inválida.');
  const collection = text(mutation.collection, 80);
  if (!COLLECTION_MODULE[collection]) throw new HttpsError('invalid-argument', 'Colección operativa inválida.');
  if (INSERT_ONLY.has(collection) && action !== 'insert') throw new HttpsError('failed-precondition', 'La auditoría es append-only.');
  if (action === 'remove' && !REMOVABLE.has(collection) && !(allowMetaFixtureRemove && collection === 'metas')) throw new HttpsError('failed-precondition', 'Borrado físico no autorizado para esta colección.');
  const id = cleanId(mutation.id || mutation.payload && mutation.payload.id, 'documentId');
  const payload = mutation.payload && typeof mutation.payload === 'object' ? stable(mutation.payload) : null;
  if (action !== 'remove' && !payload) throw new HttpsError('invalid-argument', 'Payload requerido.');
  let auditReason;
  if(mutation.auditReason!==undefined&&collection!=='aseguradoras')throw new HttpsError('invalid-argument','El motivo de aseguradoras no corresponde a esta colección.');
  if(collection==='aseguradoras'&&action!=='remove'){
    if(mutation.auditReason!==undefined&&typeof mutation.auditReason!=='string')throw new HttpsError('invalid-argument','Motivo de cambio inválido.');
    const legacyReason=Array.isArray(payload.actividad)&&typeof payload.actividad[0]?.motivo==='string'?payload.actividad[0].motivo:'';
    auditReason=text(mutation.auditReason===undefined?legacyReason:mutation.auditReason,2000);
    // A stale or forged client history can never replace the transaction's
    // canonical history. Display counts are read-only projection metadata.
    delete payload.actividad;delete payload.actividadTotal;
  }
  const secret = containsSecret(payload);
  if (secret) throw new HttpsError('failed-precondition', `Material secreto no permitido en dato operativo: ${secret}`);
  return Object.assign({ action, collection, id, payload },auditReason===undefined?{}:{auditReason});
}

const INSURER_ACTIVITY_SCHEMA='gravicentra-insurer-activity-v1';
const INSURER_AUDIT_METADATA=new Set(['id','tenantId','canonicalDocumentId','legacyDataId','createdAt','createdByUid','updatedAt','updatedByUid','updatedByEmail','ownerUid','ownerEmail','actividad','actividadTotal']);
function humanInsurerActorName(value,actor,advisorId){
  if(typeof value!=='string')return '';
  const name=text(value,220);
  if(!name||name.includes('@')||name===actor.uid||name===advisorId||/^(?:admin|admintenant|superadmin|direccion|operativo|asesor|comercial|unknown|undefined|uid[:_-].*)$/i.test(norm(name)))return '';
  return name;
}
async function insurerActivityActor(tx,tenantId,actor,auth){
  // Same approved display authority/order as product-ops-leads-domain:
  // membership -> canonical linked advisor -> verified authentication name.
  // Read only this actor's declared advisor, in the transaction's read phase.
  const advisorId=text(actor.member.advisorId||actor.member.asesorId,180);
  const human=value=>humanInsurerActorName(value,actor,advisorId);
  let name=human(actor.member.nombre)||human(actor.member.displayName)||human(actor.member.name),source='membership';
  if(!name&&ID_RE.test(advisorId)){
    const snap=await tx.get(canonicalRef(tenantId,'asesores',advisorId));
    if(snap.exists){
      const row=snap.data()||{},linkedUid=text(row.authUid||row.uid||row.userId,180);
      if((!row.tenantId||row.tenantId===tenantId)&&(!row.id||row.id===advisorId)&&(!linkedUid||linkedUid===actor.uid)){
        name=human(row.nombre)||human(row.displayName)||human(row.name);source='canonical-advisor';
      }
    }
  }
  if(!name){name=human(auth?.token?.name);source='authenticated-token';}
  if(!name){name='Usuario autorizado';source='unresolved';}
  return Object.assign({},actor,{activityName:name,activityNameSource:source});
}
function insurerActivityEntry(mutation,before,actor,eventId,fecha){
  if(before?.actividad!=null&&!Array.isArray(before.actividad))throw new HttpsError('failed-precondition','El historial canónico requiere revisión antes de guardar.');
  const changes=Object.keys(mutation.payload||{}).filter(key=>!INSURER_AUDIT_METADATA.has(key)&&!key.startsWith('__')&&
    JSON.stringify(stable(before?.[key]))!==JSON.stringify(stable(mutation.payload[key]))).sort();
  if(mutation.action==='update'&&!changes.length)return null;
  return {schemaVersion:INSURER_ACTIVITY_SCHEMA,eventId:'insact_'+sha(eventId+'|'+mutation.id).slice(0,32),fecha,
    responsable:actor.activityName+' · '+text(actor.activeRole,100),actorNameSource:actor.activityNameSource,
    cambio:mutation.action==='insert'?'Aseguradora creada':'Actualización de ficha ('+changes.join(', ')+')',
    motivo:mutation.auditReason||'',camposCambiados:changes,actorUid:actor.uid,activeRole:actor.activeRole,serverOwned:true};
}

function mutationPayloadMatches(actual,payload){
  if(!actual||!payload)return false;
  const ignore=new Set(['updatedAt','updatedByUid','updatedByEmail','createdAt','createdByUid','ownerUid','ownerEmail']);
  return Object.keys(payload).filter(key=>!ignore.has(key)).every(key=>JSON.stringify(stable(actual[key]))===JSON.stringify(stable(payload[key])));
}

async function execute(request, metaPreviewContext = null) {
  const input = request.data || {};
  const tenantId = cleanId(input.tenantId, 'tenantId');
  if(!metaPreviewContext&&(input.metaPreviewQa||[].concat(input.mutations||[]).some(m=>m?.payload?.__metasPreviewQa===true)))
    throw new HttpsError('permission-denied','El modo de prueba de metas está reservado al comando Preview.');
  const mutations = [].concat(input.mutations || []).map(m=>normalizeMutation(m,metaPreviewContext?.operation==='restore'));
  if (!mutations.length || mutations.length > 80) throw new HttpsError('invalid-argument', 'Lote operativo inválido.');
  const insurerMutations=mutations.filter(m=>m.collection==='aseguradoras');
  if(new Set(insurerMutations.map(m=>m.id)).size!==insurerMutations.length)throw new HttpsError('invalid-argument','Una aseguradora solo puede cambiar una vez por lote.');
  const actor = await authorize(request, tenantId, mutations);
  if(metaPreviewContext)requireMetaPreviewActor(actor,metaPreviewContext);
  const payloadDigest = digest(metaPreviewContext?{mutations,metaPreviewContext}:mutations);
  const requestId = cleanId(input.requestId || `op_${sha(`${tenantId}|${actor.uid}|${payloadDigest}`).slice(0, 32)}`, 'requestId');
  if(requestId.startsWith('qa_metas_'))throw new HttpsError('invalid-argument','Identificador reservado para sesión de prueba.');
  const reqRef = requestRef(tenantId, requestId);
  const eventId = `opevt_${sha(`${tenantId}|${requestId}`).slice(0, 28)}`;
  const insurerActivityDate=new Date().toISOString();
  const metaSessionRef=metaPreviewContext?metaSessionRefFor(tenantId,metaPreviewContext.runId):null;
  const metaActorRef=metaPreviewContext?metaActorRefFor(tenantId,actor.uid,metaPreviewContext.pais):null;

  const committed = await db.runTransaction(async tx => {
    const previous = await tx.get(reqRef);
    if (previous.exists) {
      const row = previous.data() || {};
      if (row.payloadDigest !== payloadDigest) throw new HttpsError('already-exists', 'El requestId corresponde a otro contenido.');
      if(insurerMutations.length&&(row.insurerActor?.uid!==actor.uid||row.insurerActor?.activeRole!==actor.activeRole))
        throw new HttpsError('permission-denied','El recibo de aseguradora pertenece a otro actor o rol activo.');
      if(metaPreviewContext&&(row.result?.metaPreviewQa?.actorUid!==actor.uid||row.result?.metaPreviewQa?.activeRole!==actor.activeRole))
        throw new HttpsError('permission-denied','El recibo de prueba pertenece a otro actor o rol activo.');
      if (row.status === 'committed') return Object.assign({ reused: true }, row.result || {});
    }

    const metaSessionSnap=metaSessionRef?await tx.get(metaSessionRef):null;
    const metaActorSnap=metaActorRef?await tx.get(metaActorRef):null;
    if(metaActorSnap?.exists){
      const pointer=metaActorSnap.data()||{};
      if(pointer.schemaVersion!==META_QA_SESSION_SCHEMA||pointer.actorUid!==actor.uid||pointer.pais!==metaPreviewContext.pais||pointer.periodo!==META_QA_PERIOD)
        throw new HttpsError('failed-precondition','Referencia de prueba inconsistente.');
      if(pointer.status==='active'&&pointer.runId!==metaPreviewContext.runId)
        throw new HttpsError('failed-precondition','Restaura la prueba activa de este país antes de iniciar otra.');
    }
    const insurerActor=insurerMutations.some(m=>m.action!=='remove')?await insurerActivityActor(tx,tenantId,actor,request.auth):actor;
    const reads = [];
    for (const mutation of mutations) {
      const ref = canonicalRef(tenantId, mutation.collection, mutation.id);
      const snap = await tx.get(ref);
      const parents=await readOperationalParents(tx,tenantId,mutation,snap.exists?snap.data():null);
      let linkedMemberRef = null, linkedMemberSnap = null;
      if (mutation.collection === 'asesores' && mutation.action !== 'remove') {
        const before = snap.exists ? snap.data() || {} : {};
        const prospective = Object.assign({}, before, mutation.payload || {}, { id: mutation.id, tenantId });
        const authUid = text(prospective.authUid || prospective.uid || prospective.userId, 180);
        if (authUid) {
          linkedMemberRef = memberRef(tenantId, authUid);
          linkedMemberSnap = await tx.get(linkedMemberRef);
        }
      }
      reads.push({ mutation, ref, snap, parents, linkedMemberRef, linkedMemberSnap });
    }

    const insurerActivityEvents=[],insurerActivities=[];
    const metaProof=metaPreviewContext?validateMetaPreviewSession(metaPreviewContext,actor,metaSessionSnap?.exists?metaSessionSnap.data():null,reads,tenantId):null;
    for (const item of reads) {
      const { mutation, ref, snap, parents, linkedMemberRef, linkedMemberSnap } = item;
      const before = snap.exists ? snap.data() : null;
      if(!metaPreviewContext&&before?.__metasPreviewQa===true)throw new HttpsError('permission-denied','El fixture requiere su contexto de prueba y actor originales.');
      if (mutation.action === 'insert' && before) throw new HttpsError('already-exists', `${mutation.collection}/${mutation.id} ya existe.`);
      if ((mutation.action === 'update' || mutation.action === 'remove') && !before) throw new HttpsError('not-found', `${mutation.collection}/${mutation.id} no existe.`);
      if(before && !withinScope(actor,mutation.collection,COLLECTION_MODULE[mutation.collection],Object.assign({id:mutation.id,tenantId},before))) throw new HttpsError('permission-denied','No autorizado para modificar el registro original.');
      let participationChange=null;
       if(mutation.collection==='asesores'&&mutation.action!=='remove'){
         try{participationChange=validarCambioParticipacion(before,mutation.payload,actor.activeRole);}
         catch(error){
           throw new HttpsError(error?.code==='DIRECCION_REQUERIDA'?'permission-denied':'invalid-argument',
             'Cambio de vinculación o participación no autorizado: '+String(error?.code||'INVALIDO'));
         }
       }
       const scopeRow=Object.assign({},before||{},mutation.payload||{},{id:mutation.id,tenantId});
      verifiedOperationalParentScope(mutation.collection,scopeRow,parents);
      if(!withinScope(actor,mutation.collection,COLLECTION_MODULE[mutation.collection],scopeRow))throw new HttpsError('permission-denied',`El alcance activo no autoriza ${mutation.collection}/${mutation.id}.`);
      if (mutation.action === 'remove') {
        if (mutation.collection === 'aseguradoras') {
          const linked = db.collection('tenants').doc(tenantId).collection('data').doc('polizas').collection('items').where('aseguradoraId','==',mutation.id).limit(1);
          const linkedSnap = await tx.get(linked);
          if (!linkedSnap.empty) throw new HttpsError('failed-precondition', 'La aseguradora tiene pólizas vinculadas y no puede eliminarse físicamente.');
        }
        tx.delete(ref);
        continue;
      }
      const row = Object.assign({}, mutation.action === 'update' ? before || {} : {}, mutation.payload, {
        id: mutation.id,
        tenantId,
        updatedAt: now(),
        updatedByUid: actor.uid
      });
      if (!before) {
        row.createdAt = row.createdAt || now();
        row.createdByUid = metaProof?actor.uid:(row.createdByUid || actor.uid);
      }
      if(mutation.collection==='aseguradoras'){
        const entry=insurerActivityEntry(mutation,before,insurerActor,eventId,insurerActivityDate);
        // No slice: existing canonical entries survive stale tabs and every
        // subsequent edit. The bounded directory projection is separate.
        row.actividad=entry?[entry,...(before?.actividad||[])]:before?.actividad||[];
        insurerActivityEvents.push({id:mutation.id,eventId:entry?.eventId||null,entryDigest:entry?digest(entry):null});
        if(entry)insurerActivities.push({entityId:mutation.id,entry});
      }
      if(metaProof&&mutation.collection==='auditoria')row.__metasPreviewEvidence={runId:metaPreviewContext.runId,operation:metaPreviewContext.operation,actorUid:actor.uid,activeRole:actor.activeRole,changes:metaProof.changes,serverVerified:true};
      tx.set(ref, row, { merge: mutation.action === 'update' });
       if(participationChange){
         const auditId='audit_equipo_metas_'+sha(tenantId+'|'+eventId+'|'+mutation.id).slice(0,32);
         tx.set(canonicalRef(tenantId,'auditoria',auditId),{
           id:auditId,tenantId,modulo:'equipo',accion:'editar_participacion_metas',
           motivo:'Clasificación o habilitación explícita de Dirección',
           usuario:actor.uid,actorUid:actor.uid,activeRole:actor.activeRole,serverOwned:true,
           advisorId:mutation.id,before:participationChange.before,after:participationChange.after,
           fecha:insurerActivityDate,createdAt:now()
         },{merge:false});
       }
      if (mutation.collection === 'asesores' && linkedMemberRef) {
        if (linkedMemberSnap && linkedMemberSnap.exists && text(linkedMemberSnap.data().advisorId, 180) && text(linkedMemberSnap.data().advisorId, 180) !== mutation.id) {
          throw new HttpsError('failed-precondition', 'La identidad está vinculada a otro usuario del equipo.');
        }
        tx.set(linkedMemberRef, membershipPatchFromAdvisor(row, linkedMemberSnap && linkedMemberSnap.exists ? linkedMemberSnap.data() : {}), { merge: true });
      }
    }

    const result = { ok: true, requestId, eventId, mutationCount: mutations.length, collections: unique(mutations.map(m => m.collection)), writePath: 'tenants/{tenant}/data/{collection}/items', serverOwned: true };
    if(insurerMutations.length)result.insurerActivityEvents=insurerActivityEvents;
    if(metaProof){
      tx.set(metaSessionRef,Object.assign({},metaProof.session,{updatedAt:now(),lastRequestId:requestId,lastAuditId:metaPreviewContext.auditId}),{merge:false});
      tx.set(metaActorRef,{schemaVersion:META_QA_SESSION_SCHEMA,actorUid:actor.uid,activeRole:actor.activeRole,runId:metaPreviewContext.runId,pais:metaPreviewContext.pais,periodo:META_QA_PERIOD,status:metaProof.session.status,updatedAt:now()},{merge:false});
      result.metaPreviewQa={version:1,contractVersion:META_QA_SESSION_SCHEMA,runId:metaPreviewContext.runId,status:metaProof.session.status,actorUid:actor.uid,activeRole:actor.activeRole,pais:metaPreviewContext.pais,periodo:metaPreviewContext.periodo,fixtureIds:Object.keys(metaProof.session.fixtures).sort(),originalAbsenceVerified:true,restoreSupported:true};
    }
    tx.set(eventRef(tenantId, eventId), Object.assign({
      schemaVersion: VERSION,
      tenantId,
      eventId,
      requestId,
      actorUid: actor.uid,
      activeRole: actor.activeRole,
      payloadDigest,
      mutationCount: mutations.length,
      collections: result.collections,
      createdAt: now(),
      containsSecrets: false
    },insurerActivities.length?{insurerActivities}:{}));
    tx.set(reqRef, Object.assign({ status: 'committed', payloadDigest, result, committedAt: now() },
      insurerMutations.length?{insurerActor:{uid:actor.uid,activeRole:actor.activeRole}}:{}), { merge: true });
    return result;
  });

  const readback=[],metaFixtures=[];
  for(const mutation of mutations){
    const snap=await canonicalRef(tenantId,mutation.collection,mutation.id).get();
    if(mutation.action==='remove'){
      if(snap.exists)throw new HttpsError('internal',`Canonical delete readback mismatch for ${mutation.collection}/${mutation.id}.`);
      readback.push({collection:mutation.collection,id:mutation.id,action:mutation.action,exists:false});
      continue;
    }
    if(!snap.exists)throw new HttpsError('internal',`Canonical readback missing for ${mutation.collection}/${mutation.id}.`);
    const actual=snap.data()||{};
    if(!mutationPayloadMatches(actual,mutation.payload))throw new HttpsError('internal',`Canonical readback mismatch for ${mutation.collection}/${mutation.id}.`);
    if(metaPreviewContext&&mutation.collection==='metas')metaFixtures.push(actual);
    const proof={collection:mutation.collection,id:mutation.id,action:mutation.action,exists:true};
    if(mutation.collection==='aseguradoras'){
      const binding=committed.insurerActivityEvents?.find(item=>item.id===mutation.id);
      if(!binding)throw new HttpsError('internal','Falta el recibo canónico de actividad.');
      if(binding.eventId){
        const entry=(Array.isArray(actual.actividad)?actual.actividad:[]).find(item=>item?.eventId===binding.eventId);
        if(!entry||digest(entry)!==binding.entryDigest)throw new HttpsError('internal','La actividad no coincide con el commit canónico.');
      }
      proof.insurerActivity=Object.assign({version:1,serverOwned:true,eventId:binding.eventId},projectInsurerActivity(actual.actividad));
    }
    readback.push(proof);
  }
  const response=Object.assign({},committed,{canonicalReadback:true,canonicalReadbackCount:readback.length,readback});
  if(metaPreviewContext)response.metaPreviewQa=Object.assign({},committed.metaPreviewQa,{fixtures:metaFixtures});
  return response;
}

async function uploadProductAsset(request, previewOnly) {
  const input=request.data||{},tenantId=cleanId(input.tenantId,'tenantId'),insurerId=cleanId(input.insurerId,'insurerId');
  if(previewOnly===true && !/^(?:b2-asg-[a-z0-9-]+|b4003qa_[A-Za-z0-9._:-]+)$/i.test(insurerId)) throw new HttpsError('permission-denied','El upload aislado de Preview solo admite fixtures sintéticos B2.');
  const actor=await authorize(request,tenantId,[{collection:'aseguradoras'}]);
  const insurerRef=canonicalRef(tenantId,'aseguradoras',insurerId),insurerSnap=await insurerRef.get();
  if(!insurerSnap.exists)throw new HttpsError('not-found','Aseguradora no encontrada.');
  if(!withinScope(actor,'aseguradoras','aseguradoras',Object.assign({},insurerSnap.data()||{},{id:insurerId,tenantId})))throw new HttpsError('permission-denied','El alcance activo no autoriza esta aseguradora.');
  const mime=text(input.mimeType,80).toLowerCase(),allowed={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
  const ext=allowed[mime];if(!ext)throw new HttpsError('invalid-argument','Formato de logo no permitido.');
  const encoded=String(input.base64||'').replace(/\s+/g,'');if(!encoded||encoded.length>3_000_000)throw new HttpsError('invalid-argument','Archivo de logo inválido o demasiado grande.');
  let bytes;try{bytes=Buffer.from(encoded,'base64');}catch(e){throw new HttpsError('invalid-argument','Archivo de logo inválido.');}
  if(!bytes.length||bytes.length>2*1024*1024)throw new HttpsError('invalid-argument','El logo no puede superar 2 MB.');
  const contentHash=sha(bytes),assetRef=(previewOnly===true?'preview/':'')+'tenants/'+tenantId+'/assets/insurers/'+insurerId+'/logo-'+contentHash.slice(0,20)+'.'+ext;
  let firebaseConfig={};try{firebaseConfig=JSON.parse(process.env.FIREBASE_CONFIG||'{}')||{};}catch(e){}
  const projectId=text(app.options&&app.options.projectId||process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'',120);
  const bucketCandidates=unique([
    app.options&&app.options.storageBucket,
    firebaseConfig.storageBucket,
    process.env.ORBIT360_STORAGE_BUCKET,
    projectId?projectId+'.firebasestorage.app':'',
    projectId?projectId+'.appspot.com':''
  ]);
  const token=crypto.randomUUID(),saveOptions={resumable:false,contentType:mime,metadata:{cacheControl:'public,max-age=3600',metadata:{firebaseStorageDownloadTokens:token,tenantId,insurerId,assetKind:'insurer-logo',contentHash}}};
  let bucket=null,lastStorageError=null;
  for(const bucketName of bucketCandidates){
    try{
      const candidate=storage.bucket(bucketName),candidateFile=candidate.file(assetRef);
      await candidateFile.save(bytes,saveOptions);
      bucket=candidate;break;
    }catch(error){lastStorageError=error;}
  }
  if(!bucket)throw new HttpsError('failed-precondition','STORAGE_ASSET_WRITE_UNAVAILABLE',{bucketCandidates,errorCode:text(lastStorageError&&(lastStorageError.code||lastStorageError.message)||'',180)});
  const url='https://firebasestorage.googleapis.com/v0/b/'+encodeURIComponent(bucket.name)+'/o/'+encodeURIComponent(assetRef)+'?alt=media&token='+encodeURIComponent(token);
  await insurerRef.set({logo:url,logoAssetRef:assetRef,logoContentHash:contentHash,logoUpdatedAt:now(),logoUpdatedByUid:actor.uid},{merge:true});
  const confirmed=await insurerRef.get(),row=confirmed.data()||{};
  if(row.logo!==url||row.logoAssetRef!==assetRef)throw new HttpsError('internal','No fue posible confirmar el logo guardado.');
  if(previewOnly!==true){
    const eventId='asset_'+sha(tenantId+'|'+insurerId+'|'+contentHash).slice(0,28);
    await eventRef(tenantId,eventId).set({schemaVersion:VERSION,tenantId,eventId,actorUid:actor.uid,activeRole:actor.activeRole,collection:'aseguradoras',entityId:insurerId,assetKind:'insurer-logo',assetRef,contentHash,mimeType:mime,size:bytes.length,createdAt:now(),containsSecrets:false},{merge:false});
  }
  return{ok:true,insurerId,assetRef,url,contentHash,mimeType:mime,size:bytes.length,serverOwned:true,canonicalReadback:true,previewIsolated:previewOnly===true};
}


async function readProductAsset(request, previewOnly) {
  const input=request.data||{},tenantId=cleanId(input.tenantId,'tenantId'),insurerId=cleanId(input.insurerId,'insurerId');
  if(previewOnly===true && !/^(?:b2-asg-[a-z0-9-]+|b4003qa_[A-Za-z0-9._:-]+)$/i.test(insurerId)) throw new HttpsError('permission-denied','La lectura aislada de Preview solo admite fixtures sintéticos B2.');
  const actor=await authorizeRead(request,tenantId,'aseguradoras');
  const insurerRef=canonicalRef(tenantId,'aseguradoras',insurerId),snap=await insurerRef.get();
  if(!snap.exists)throw new HttpsError('not-found','Aseguradora no encontrada.');
  const row=Object.assign({},snap.data()||{},{id:insurerId,tenantId});
  if(!withinScope(actor,'aseguradoras','aseguradoras',row))throw new HttpsError('permission-denied','El alcance activo no autoriza esta aseguradora.');
  const assetRef=text(row.logoAssetRef,1000),requested=text(input.assetRef,1000);
  if(!assetRef)throw new HttpsError('not-found','La aseguradora no tiene un logo administrado.');
  if(requested&&requested!==assetRef)throw new HttpsError('failed-precondition','La referencia solicitada no coincide con el logo vigente.');
  if(previewOnly===true&&!assetRef.startsWith('preview/tenants/'+tenantId+'/assets/insurers/'+insurerId+'/'))throw new HttpsError('permission-denied','El asset no pertenece al fixture Preview autorizado.');
  let firebaseConfig={};try{firebaseConfig=JSON.parse(process.env.FIREBASE_CONFIG||'{}')||{};}catch(e){}
  const projectId=text(app.options&&app.options.projectId||process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'',120);
  const urlBucket=(()=>{const m=text(row.logo,5000).match(/\/v0\/b\/([^/]+)\/o\//i);try{return m?decodeURIComponent(m[1]):'';}catch(e){return m?m[1]:'';}})();
  const bucketCandidates=unique([
    urlBucket,
    app.options&&app.options.storageBucket,
    firebaseConfig.storageBucket,
    process.env.ORBIT360_STORAGE_BUCKET,
    projectId?projectId+'.firebasestorage.app':'',
    projectId?projectId+'.appspot.com':''
  ]);
  let found=null,lastError=null;
  for(const bucketName of bucketCandidates){
    try{
      const bucket=storage.bucket(bucketName),file=bucket.file(assetRef),exists=(await file.exists())[0];
      if(!exists)continue;
      const [metadata]=await file.getMetadata(),size=Number(metadata&&metadata.size||0),mime=text(metadata&&metadata.contentType,80).toLowerCase();
      if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new HttpsError('failed-precondition','El logo almacenado no tiene un formato permitido.');
      if(!size||size>2*1024*1024)throw new HttpsError('failed-precondition','El logo almacenado excede el tamaño permitido.');
      const [bytes]=await file.download();
      if(!bytes||!bytes.length||bytes.length>2*1024*1024)throw new HttpsError('failed-precondition','No fue posible leer el logo almacenado.');
      found={bucketName,mime,bytes};break;
    }catch(error){lastError=error;}
  }
  if(!found)throw new HttpsError('not-found','No fue posible resolver el logo almacenado.',{errorCode:text(lastError&&(lastError.code||lastError.message)||'',180)});
  return{
    ok:true,
    insurerId,
    assetRef,
    mimeType:found.mime,
    base64:found.bytes.toString('base64'),
    contentHash:crypto.createHash('sha256').update(found.bytes).digest('hex'),
    serverOwned:true,
    canonicalReadback:true,
    previewIsolated:previewOnly===true
  };
}

exports.orbit360ProductAssetUpload = onCall({ region: REGION, cors: true, timeoutSeconds: 60, memory: '256MiB' }, request=>uploadProductAsset(request,false));
exports.orbit360ProductAssetUploadPreview = onCall({ region: PREVIEW_REGION, cors: true, timeoutSeconds: 60, memory: '256MiB' }, request=>uploadProductAsset(request,true));
exports.orbit360ProductAssetRead = onCall({ region: REGION, cors: true, timeoutSeconds: 60, memory: '256MiB' }, request=>readProductAsset(request,false));
exports.orbit360ProductAssetReadPreview = onCall({ region: PREVIEW_REGION, cors: true, timeoutSeconds: 60, memory: '256MiB' }, request=>readProductAsset(request,true));
async function executePreview(request) {
  const input=request.data||{},raw=[].concat(input.mutations||[]);
  // Empty, read-only probe fails closed against an older deployed writer.
  // Inspection also survives reload without relying on projected row markers.
  if(['probe','inspect'].includes(input.metaPreviewQa?.operation))return inspectMetaPreview(request);
  const syntheticId=v=>/(?:^|_)(?:b3004qa|b4003qa)_[A-Za-z0-9._:-]+$/i.test(text(v,256));
  if(!raw.length||raw.some(m=>!syntheticId(m&&(m.id||(m.payload&&m.payload.id))))) {
    throw new HttpsError('permission-denied','Preview operativo solo admite fixtures sintéticos autorizados B3-004/B4-003.');
  }
  if(raw.some(m=>norm(m&&m.action)!=='remove'&&(!m.payload||m.payload.__syntheticQa!==true))) {
    throw new HttpsError('permission-denied','Preview operativo requiere marca sintética explícita.');
  }
  const metaContext=input.metaPreviewQa?metaPreviewContract(input,raw,request.auth&&request.auth.uid):null;
  return execute(request,metaContext);
}
exports.orbit360ProductOperationalCommand = onCall({ region: REGION, cors: true, timeoutSeconds: 60, memory: '256MiB' }, request=>execute(request));
exports.orbit360ProductOperationalCommandPreview = onCall({ region: PREVIEW_REGION, cors: true, timeoutSeconds: 60, memory: '256MiB' }, executePreview);
// Additive isolated Preview endpoint retains the synthetic-only executePreview gate.
exports.orbit360ProductOperationalCommandGoalsPreview = onCall({ region: PREVIEW_REGION, cors: true, timeoutSeconds: 60, memory: '256MiB' }, executePreview);
exports.__productOperationalDomain = Object.freeze({ VERSION, COLLECTION_MODULE, INSERT_ONLY, REMOVABLE, authorize, authorizeRead, withinScope, canonicalRef, text, cleanId, readProductAsset });
