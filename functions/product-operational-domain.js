'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { resolveProductActiveRole } = require('./product-active-role-contract');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'gravicentra-product-operational-domain-v3-b1-canonical-access';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);

const COLLECTION_MODULE = Object.freeze({
  clientes: 'cliente360',
  aseguradoras: 'aseguradoras',
  polizas: 'polizas',
  vehiculos: 'polizas',
  recibosEsperados: 'polizas',
  carteraPrimas: 'polizas',
  cobros: 'cobros',
  reclamos: 'siniestros',
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
  const status = norm(member && (member.status || member.estado));
  return !!member && member.active !== false && member.activo !== false && !['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(status);
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
  if(!moduleVisibleForWrite(member,accessConfig,role,moduleKey))return false;
  const permissions=permissionsOf(member),extraKeys=[`${moduleKey}_manage`,`${moduleKey}_edit`,`${moduleKey}_editar`,`${moduleKey}_create`,`${moduleKey}_crear`].map(norm); if(permissions.some(p=>extraKeys.includes(p)))return true;
  const configured=matrixPermission(accessConfig,role,moduleKey,'editar'); return configured==null?legacyWriteAllowed(member,role,moduleKey,collection):configured;
}
function countryAllowed(member,row){const allowed=unique(member&&member.countries).map(v=>text(v,8).toUpperCase());if(!allowed.length)return true;const p=text(row&&row.pais,8).toUpperCase();return !p||['REQUIERE_VALIDACION','POR_VALIDAR','PENDIENTE'].includes(p)||allowed.includes(p);}
function rowAdvisorId(collection,row){if(collection==='asesores')return text(row&&row.id,180);return text(row&&(row.asesorId||row.advisorId||row.ownerAdvisorId),180);}
const UNSCOPED_COLLECTIONS=new Set(['aseguradoras','auditoria','auditoriaAsegExterna']);
function withinScope(actor,collection,moduleKey,row){
  if(UNSCOPED_COLLECTIONS.has(collection))return true; if(!countryAllowed(actor.member,row))return false;
  const scope=effectiveScope(actor.member,actor.accessConfig,actor.activeRole,moduleKey); if(scope==='none')return false; if(scope==='all')return true;
  const target=rowAdvisorId(collection,row); if(!target)return false; if(scope==='own')return target===text(actor.member.advisorId,180); if(scope==='team')return actor.teamAdvisorIds.has(target); return false;
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
  const roleMapKey=Object.keys(roleMap).find(k=>norm(k)===norm(requestedRole)); unique(roleMapKey?roleMap[roleMapKey]:[]).forEach(id=>teamAdvisorIds.add(id)); unique(member.teamAdvisorIds||member.asesoresEquipo||[]).forEach(id=>teamAdvisorIds.add(id));
  if(needsTeam){const teamId=text(member.teamId||member.equipoId,160); if(teamId||own){const advisorSnap=await db.collection('tenants').doc(tenantId).collection('data').doc('asesores').collection('items').get(); advisorSnap.docs.forEach(doc=>{const row=doc.data()||{},id=text(row.id||doc.id,180);if(teamId&&text(row.teamId||row.equipoId,160)===teamId)teamAdvisorIds.add(id);if(own&&text(row.supervisorId,180)===own)teamAdvisorIds.add(id);});}}
  return{uid:request.auth.uid,activeRole:requestedRole,member,accessConfig,teamAdvisorIds};
}
function normalizeMutation(raw) {
  const mutation = raw || {};
  const action = norm(mutation.action);
  if (!['insert','update','remove'].includes(action)) throw new HttpsError('invalid-argument', 'Acción operativa inválida.');
  const collection = text(mutation.collection, 80);
  if (!COLLECTION_MODULE[collection]) throw new HttpsError('invalid-argument', 'Colección operativa inválida.');
  if (INSERT_ONLY.has(collection) && action !== 'insert') throw new HttpsError('failed-precondition', 'La auditoría es append-only.');
  if (action === 'remove' && !REMOVABLE.has(collection)) throw new HttpsError('failed-precondition', 'Borrado físico no autorizado para esta colección.');
  const id = cleanId(mutation.id || mutation.payload && mutation.payload.id, 'documentId');
  const payload = mutation.payload && typeof mutation.payload === 'object' ? stable(mutation.payload) : null;
  if (action !== 'remove' && !payload) throw new HttpsError('invalid-argument', 'Payload requerido.');
  const secret = containsSecret(payload);
  if (secret) throw new HttpsError('failed-precondition', `Material secreto no permitido en dato operativo: ${secret}`);
  return { action, collection, id, payload };
}

async function execute(request) {
  const input = request.data || {};
  const tenantId = cleanId(input.tenantId, 'tenantId');
  const mutations = [].concat(input.mutations || []).map(normalizeMutation);
  if (!mutations.length || mutations.length > 80) throw new HttpsError('invalid-argument', 'Lote operativo inválido.');
  const actor = await authorize(request, tenantId, mutations);
  const payloadDigest = digest(mutations);
  const requestId = cleanId(input.requestId || `op_${sha(`${tenantId}|${actor.uid}|${payloadDigest}`).slice(0, 32)}`, 'requestId');
  const reqRef = requestRef(tenantId, requestId);
  const eventId = `opevt_${sha(`${tenantId}|${requestId}`).slice(0, 28)}`;

  return db.runTransaction(async tx => {
    const previous = await tx.get(reqRef);
    if (previous.exists) {
      const row = previous.data() || {};
      if (row.payloadDigest !== payloadDigest) throw new HttpsError('already-exists', 'El requestId corresponde a otro contenido.');
      if (row.status === 'committed') return Object.assign({ reused: true }, row.result || {});
    }

    const reads = [];
    for (const mutation of mutations) {
      const ref = canonicalRef(tenantId, mutation.collection, mutation.id);
      const snap = await tx.get(ref);
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
      reads.push({ mutation, ref, snap, linkedMemberRef, linkedMemberSnap });
    }

    for (const item of reads) {
      const { mutation, ref, snap, linkedMemberRef, linkedMemberSnap } = item;
      const before = snap.exists ? snap.data() : null;
      if (mutation.action === 'insert' && before) throw new HttpsError('already-exists', `${mutation.collection}/${mutation.id} ya existe.`);
      if ((mutation.action === 'update' || mutation.action === 'remove') && !before) throw new HttpsError('not-found', `${mutation.collection}/${mutation.id} no existe.`);
      const scopeRow=Object.assign({},before||{},mutation.payload||{},{id:mutation.id,tenantId});
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
        row.createdByUid = row.createdByUid || actor.uid;
      }
      tx.set(ref, row, { merge: mutation.action === 'update' });
      if (mutation.collection === 'asesores' && linkedMemberRef) {
        if (linkedMemberSnap && linkedMemberSnap.exists && text(linkedMemberSnap.data().advisorId, 180) && text(linkedMemberSnap.data().advisorId, 180) !== mutation.id) {
          throw new HttpsError('failed-precondition', 'La identidad está vinculada a otro usuario del equipo.');
        }
        tx.set(linkedMemberRef, membershipPatchFromAdvisor(row, linkedMemberSnap && linkedMemberSnap.exists ? linkedMemberSnap.data() : {}), { merge: true });
      }
    }

    const result = { ok: true, requestId, eventId, mutationCount: mutations.length, collections: unique(mutations.map(m => m.collection)), writePath: 'tenants/{tenant}/data/{collection}/items', serverOwned: true };
    tx.set(eventRef(tenantId, eventId), {
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
    });
    tx.set(reqRef, { status: 'committed', payloadDigest, result, committedAt: now() }, { merge: true });
    return result;
  });
}

exports.orbit360ProductOperationalCommand = onCall({ region: REGION, cors: true, timeoutSeconds: 60, memory: '256MiB' }, execute);
exports.__productOperationalDomain = Object.freeze({ VERSION, COLLECTION_MODULE, INSERT_ONLY, REMOVABLE });
