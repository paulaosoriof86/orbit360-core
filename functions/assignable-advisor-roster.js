'use strict';
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {HttpsError,onCall}=require('firebase-functions/v2/https');
const REGION=process.env.ORBIT360_FUNCTIONS_REGION||'us-central1',PREVIEW_REGION=process.env.ORBIT360_PREVIEW_FUNCTIONS_REGION||'us-east1';
const VERSION='gravicentra-assignable-advisor-roster-v1',db=getFirestore(getApps()[0]||initializeApp());
const FULL=new Set(['superadmin','super_admin','superadministrador','admintenant','admin_tenant','admin','direccion','operativo']),SELF=new Set(['asesor','comercial']);
const text=(v,m=180)=>String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,m);
const norm=v=>text(v,120).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const unique=a=>Array.from(new Set([].concat(a||[]).map(v=>text(v)).filter(Boolean)));
const roles=r=>unique([...(Array.isArray(r&&r.roles)?r.roles:[]),...(Array.isArray(r&&r.rolesAsignados)?r.rolesAsignados:[]),r&&r.rol,r&&r.role,r&&r.rolDefault,r&&r.defaultRole]).map(norm);
const countries=r=>unique([...(Array.isArray(r&&r.paises)?r.paises:[]),...(Array.isArray(r&&r.countries)?r.countries:[]),r&&r.pais,r&&r.country,r&&r.paisDefault,r&&r.countryDefault]).map(v=>text(v,8).toUpperCase());
const active=r=>!!r&&r.activo!==false&&r.active!==false&&r.inactivo!==true&&!['inactivo','inactive','blocked','bloqueado','eliminado','deleted'].includes(norm(r.estado||r.status));
function roleConfig(access,role){const all=access&&access.rolePermissions&&typeof access.rolePermissions==='object'?access.rolePermissions:{};const k=Object.keys(all).find(x=>norm(x)===norm(role));return k?all[k]:null;}
function matrix(access,role,moduleKey,action){const rc=roleConfig(access,role);if(!rc||typeof rc!=='object')return null;const k=Object.keys(rc).find(x=>norm(x)===norm(moduleKey)),cell=k?rc[k]:null;return cell&&cell[action]!=null?cell[action]===true:null;}
function restricted(member,moduleKey){return unique(member&&(member.modulesRestricted||member.modulosRestringidos)).map(norm).includes(norm(moduleKey));}
function extra(member,moduleKey){return unique(member&&(member.modulesExtra||member.modulosExtra)).map(norm).includes(norm(moduleKey));}
function moduleCanAssign(member,access,role,moduleKey){if(restricted(member,moduleKey))return false;if(extra(member,moduleKey))return true;const edit=matrix(access,role,moduleKey,'editar');if(edit!=null)return edit;const view=matrix(access,role,moduleKey,'ver');if(view===false)return false;return FULL.has(role)||SELF.has(role);}
async function authz(request){
 if(!request.auth?.uid)throw new HttpsError('unauthenticated','Se requiere sesión activa.');
 const tenantId=text(request.data?.tenantId,160);if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/.test(tenantId))throw new HttpsError('invalid-argument','tenantId inválido.');
 const [snap,accessSnap]=await Promise.all([db.collection('tenants').doc(tenantId).collection('members').doc(request.auth.uid).get(),db.collection('tenants').doc(tenantId).collection('config').doc('access').get()]),member=snap.exists?(snap.data()||{}):null,access=accessSnap.exists?(accessSnap.data()||{}):{};
 if(!active(member)||text(member.tenantId,160)!==tenantId)throw new HttpsError('permission-denied','Membresía inactiva o fuera del tenant.');
 const assigned=roles(member),role=norm(request.data?.activeRole||member.activeRole||member.defaultRole||member.rolActivo||member.rol);
 if(!role||!assigned.includes(role))throw new HttpsError('permission-denied','El rol activo no está asignado.');
 const ops=moduleCanAssign(member,access,role,'ops'),leads=moduleCanAssign(member,access,role,'leads');if(!ops&&!leads)throw new HttpsError('permission-denied','El rol activo no puede asignar trabajo en Ops/Leads.');
 if(FULL.has(role))return{tenantId,mode:'full',member,access};if(SELF.has(role))return{tenantId,mode:'self',member,access};
 throw new HttpsError('permission-denied','El rol activo no puede asignar responsables.');
}
function project(doc){const r=doc.data()||{},rr=roles(r),ps=countries(r),eligible=rr.includes('asesor')||rr.includes('comercial');return{id:text(r.canonicalDocumentId||r.id||doc.id,160),nombre:text(r.nombre||r.name||r.displayName),activo:active(r),assignable:active(r)&&eligible,roleEligible:eligible,paises:ps};}
async function execute(request){
 const a=await authz(request),wanted=text(request.data?.country,8).toUpperCase(),snap=await db.collection('tenants').doc(a.tenantId).collection('data').doc('asesores').collection('items').get(),rows=[],seen=new Set();
 for(const doc of snap.docs){const r=project(doc);if(!r.id||!r.nombre||!r.assignable)continue;if(wanted&&wanted!=='TODOS'&&r.paises.length&&!r.paises.includes(wanted))continue;if(a.mode==='self'){const self=text(a.member.advisorId||a.member.asesorId,160);if(!self||r.id!==self)continue;}if(seen.has(r.id))continue;seen.add(r.id);rows.push(r);}
 rows.sort((x,y)=>x.nombre.localeCompare(y.nombre,'es',{sensitivity:'base'}));return{ok:true,schemaVersion:VERSION,country:wanted||'',scope:a.mode,rows};
}
exports.orbit360AssignableAdvisorRoster=onCall({region:REGION,cors:true},execute);
exports.orbit360AssignableAdvisorRosterPreview=onCall({region:PREVIEW_REGION,cors:true},execute);
exports.__assignableAdvisorRoster=Object.freeze({VERSION,FULL,SELF});
