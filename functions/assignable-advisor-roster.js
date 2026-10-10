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
 if(request.data?.purpose==='inicio')return r23Dashboard(request);
 const a=await authz(request),wanted=text(request.data?.country,8).toUpperCase(),snap=await db.collection('tenants').doc(a.tenantId).collection('data').doc('asesores').collection('items').get(),rows=[],seen=new Set();
 for(const doc of snap.docs){const r=project(doc);if(!r.id||!r.nombre||!r.assignable)continue;if(wanted&&wanted!=='TODOS'&&r.paises.length&&!r.paises.includes(wanted))continue;if(a.mode==='self'){const self=text(a.member.advisorId||a.member.asesorId,160);if(!self||r.id!==self)continue;}if(seen.has(r.id))continue;seen.add(r.id);rows.push(r);}
 rows.sort((x,y)=>x.nombre.localeCompare(y.nombre,'es',{sensitivity:'base'}));return{ok:true,schemaVersion:VERSION,country:wanted||'',scope:a.mode,rows};
}

const R23_SCOPE={none:0,own:1,team:2,all:3};
function r23Scope(v){const n=norm(v);return /^(none|ninguno|sin_acceso)$/.test(n)?'none':/^(own|propio|propios|mios)$/.test(n)?'own':/^(team|equipo)$/.test(n)?'team':/^(all|todos|todo|global)$/.test(n)?'all':'';}
async function r23Dashboard(request){
 if(!request.auth?.uid)throw new HttpsError('unauthenticated','Sesión requerida');
 const tenantId=text(request.data?.tenantId,160),country=text(request.data?.country,8).toUpperCase(),month=text(request.data?.month,7);
 if(!/^[\w][\w.:-]{1,159}$/.test(tenantId)||!['GT','CO','TODOS'].includes(country)||!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month))throw new HttpsError('invalid-argument','Consulta de Inicio inválida');
 const tenant=db.collection('tenants').doc(tenantId),[m,c]=await Promise.all([tenant.collection('members').doc(request.auth.uid).get(),tenant.collection('config').doc('access').get()]);
 const member=m.exists?m.data()||{}:null,access=c.exists?c.data()||{}:{},role=norm(request.data?.activeRole||member?.activeRole||member?.defaultRole||member?.rol);
 if(!active(member)||text(member.tenantId,160)!==tenantId||!roles(member).includes(role)||(!FULL.has(role)&&!SELF.has(role))||restricted(member,'inicio')||matrix(access,role,'inicio','ver')===false)throw new HttpsError('permission-denied','Acceso Inicio no autorizado');
 const ds=member.dataScopes||{},modules=ds.modules||{},mk=Object.keys(modules).find(k=>norm(k)==='inicio'),wanted=r23Scope((mk&&modules[mk])||ds.default||member.scopeDatos||member.dataScope);
 const rsc=access.roleScopes||{},rk=Object.keys(rsc).find(k=>norm(k)===role),ceiling=r23Scope(rk&&rsc[rk])||(FULL.has(role)?'all':'own'),scope=wanted&&R23_SCOPE[wanted]<=R23_SCOPE[ceiling]?wanted:ceiling;
 if(scope==='none')throw new HttpsError('permission-denied','Sin alcance de Inicio');
 const cc=unique(member.countries||member.paises||member.paisesAutorizados).map(v=>text(v,8).toUpperCase()).filter(v=>v==='GT'||v==='CO');
 if(country!=='TODOS'&&cc.length&&!cc.includes(country))throw new HttpsError('permission-denied','País no autorizado');
 const teamIds=new Set(unique(member.teamAdvisorIds||member.equipoAsesorIds||member.asesoresEquipo)),mapping=member.roleVisibleAdvisorIds||{},rm=Object.keys(mapping).find(k=>norm(k)===role);
 unique(rm?mapping[rm]:[]).forEach(x=>teamIds.add(x));
 const own=text(member.advisorId||member.asesorId,160),team=text(member.teamId||member.equipoId,160);if(own)teamIds.add(own);
 const [as,gs]=await Promise.all([tenant.collection('data').doc('asesores').collection('items').get(),tenant.collection('data').doc('metas').collection('items').get()]);
 const goals=new Map();gs.docs.forEach(d=>{const g=d.data()||{},id=text(g.asesorId||g.advisorId,160),type=norm(g.tipo),c=text(g.pais,8).toUpperCase()||(text(g.moneda,8).toUpperCase()==='GTQ'?'GT':text(g.moneda,8).toUpperCase()==='COP'?'CO':''),n=Number(g.valor);if(!id||String(g.mes||g.periodo||'').slice(0,7)!==month||!['GT','CO'].includes(c)||!['nueva','renovada','recaudo'].includes(type)||g.valor==null||g.valor===''||!Number.isFinite(n)||n<0)return;const key=id+'|'+c,v=goals.get(key)||{nueva:0,renovada:0,recaudo:0,produccion:0,explicit:false};v[type]+=n;v.produccion=v.nueva+v.renovada;v.explicit=true;goals.set(key,v);});
 const rows=[],seen=new Set();for(const d of as.docs){const raw=d.data()||{},a=project(d);if(!a.id||!a.nombre||seen.has(a.id))continue;if(scope==='own'&&a.id!==own)continue;if(scope==='team'&&!teamIds.has(a.id)&&(!team||text(raw.teamId||raw.equipoId,160)!==team))continue;
 const paises=a.paises.filter(c=>(c==='GT'||c==='CO')&&(!cc.length||cc.includes(c))&&(country==='TODOS'||country===c));if(!paises.length)continue;seen.add(a.id);
 const metas={};paises.forEach(c=>metas[c]=goals.get(a.id+'|'+c)||{nueva:0,renovada:0,recaudo:0,produccion:0,explicit:false});
 const legacy=Number(raw.metaPrima);rows.push({id:a.id,nombre:a.nombre,activo:a.activo,paises,metas,metaPrima:Number.isFinite(legacy)&&legacy>0&&paises.length===1?legacy:null});
 }rows.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'})||a.id.localeCompare(b.id));
 return{ok:true,schemaVersion:'gravicentra-inicio-r23',country,month,scope,rows};
}

exports.orbit360AssignableAdvisorRoster=onCall({region:REGION,cors:true},execute);
exports.orbit360AssignableAdvisorRosterPreview=onCall({region:PREVIEW_REGION,cors:true},execute);
exports.__assignableAdvisorRoster=Object.freeze({VERSION,FULL,SELF});
