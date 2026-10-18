'use strict';
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {HttpsError,onCall}=require('firebase-functions/v2/https');
const {resolveProductActiveRole}=require('./product-active-role-contract');
const REGION=process.env.ORBIT360_FUNCTIONS_REGION||'us-central1',PREVIEW_REGION=process.env.ORBIT360_PREVIEW_FUNCTIONS_REGION||'us-east1';
const VERSION='gravicentra-assignable-advisor-roster-v1',DASHBOARD_CONTRACT='gi-i65-b4-003-executive-read-v1',db=getFirestore(getApps()[0]||initializeApp());
const FULL=new Set(['superadmin','super_admin','superadministrador','admintenant','admin_tenant','admin','direccion','operativo']),SELF=new Set(['asesor','comercial']);
const text=(v,m=180)=>String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,m);
const norm=v=>text(v,120).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const unique=a=>Array.from(new Set([].concat(a||[]).map(v=>text(v)).filter(Boolean)));
const roles=r=>unique([...(Array.isArray(r&&r.roles)?r.roles:[]),...(Array.isArray(r&&r.rolesAsignados)?r.rolesAsignados:[]),r&&r.rol,r&&r.role,r&&r.rolDefault,r&&r.defaultRole]).map(norm);
const countries=r=>unique([...(Array.isArray(r&&r.paises)?r.paises:[]),...(Array.isArray(r&&r.countries)?r.countries:[]),r&&r.pais,r&&r.country,r&&r.paisDefault,r&&r.countryDefault]).map(v=>text(v,8).toUpperCase());
// Roster rows may have only an activo flag; signed-in membership needs affirmative status.
const active=r=>!!r&&r.activo!==false&&r.active!==false&&r.inactivo!==true&&!['inactivo','inactive','blocked','bloqueado','eliminado','deleted','pending','pendiente','invited','invitado','suspended','suspendido'].includes(norm(r.estado||r.status));
function activeMember(member) {
  if (!member || member.active === false || member.activo === false || member.inactivo === true) return false;
  const states = [member.status, member.estado].map(norm).filter(Boolean);
  return states.length > 0 && states.every(state => state === 'active' || state === 'activo');
}
function roleConfig(access,role){const all=access&&access.rolePermissions&&typeof access.rolePermissions==='object'?access.rolePermissions:{};const k=Object.keys(all).find(x=>norm(x)===norm(role));return k?all[k]:null;}
function matrix(access,role,moduleKey,action){const rc=roleConfig(access,role);if(!rc||typeof rc!=='object')return null;const k=Object.keys(rc).find(x=>norm(x)===norm(moduleKey)),cell=k?rc[k]:null;return cell&&cell[action]!=null?cell[action]===true:null;}
function restricted(member,moduleKey){return unique(member&&(member.modulesRestricted||member.modulosRestringidos)).map(norm).includes(norm(moduleKey));}
function extra(member,moduleKey){return unique(member&&(member.modulesExtra||member.modulosExtra)).map(norm).includes(norm(moduleKey));}
function moduleCanAssign(member,access,role,moduleKey){if(restricted(member,moduleKey))return false;if(extra(member,moduleKey))return true;const edit=matrix(access,role,moduleKey,'editar');if(edit!=null)return edit;const view=matrix(access,role,moduleKey,'ver');if(view===false)return false;return FULL.has(role)||SELF.has(role);}
async function authz(request){
 if(!request.auth?.uid)throw new HttpsError('unauthenticated','Se requiere sesión activa.');
 const tenantId=text(request.data?.tenantId,160);if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/.test(tenantId))throw new HttpsError('invalid-argument','tenantId inválido.');
 const [snap,accessSnap]=await Promise.all([db.collection('tenants').doc(tenantId).collection('members').doc(request.auth.uid).get(),db.collection('tenants').doc(tenantId).collection('config').doc('access').get()]),member=snap.exists?(snap.data()||{}):null,access=accessSnap.exists?(accessSnap.data()||{}):{};
 if(!activeMember(member)||text(member.tenantId,160)!==tenantId)throw new HttpsError('permission-denied','Membresía inactiva o fuera del tenant.');
 let role;
 try{role=resolveProductActiveRole(member,request.data?.activeRole).activeRole;}
 catch(_){throw new HttpsError('permission-denied','El rol activo no está asignado.');}
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
 const member=m.exists?m.data()||{}:null,access=c.exists?c.data()||{}:{};
  let role;
  try{role=resolveProductActiveRole(member,request.data?.activeRole).activeRole;}
  catch(_){throw new HttpsError('permission-denied','El rol activo no está asignado.');}
 if(!activeMember(member)||text(member.tenantId,160)!==tenantId||(!FULL.has(role)&&!SELF.has(role))||restricted(member,'inicio')||matrix(access,role,'inicio','ver')===false)throw new HttpsError('permission-denied','Acceso Inicio no autorizado');
 const ds=member.dataScopes||{},modules=ds.modules&&typeof ds.modules==='object'&&!Array.isArray(ds.modules)?ds.modules:{},mk=Object.keys(modules).find(k=>norm(k)==='inicio');
 const rawScope=(mk!==undefined?modules[mk]:undefined)??ds.default??member.scopeDatos??member.dataScope;
 const wanted=r23Scope(rawScope);
 if(text(rawScope)&&!wanted)throw new HttpsError('permission-denied','Alcance de Inicio inválido');
 const rsc=access.roleScopes||{},rk=Object.keys(rsc).find(k=>norm(k)===role),configured=r23Scope(rk&&rsc[rk]);
 const ceiling=SELF.has(role)?(configured&&R23_SCOPE[configured]<R23_SCOPE.own?configured:'own'):(configured||'all');
 const scope=wanted&&R23_SCOPE[wanted]<=R23_SCOPE[ceiling]?wanted:ceiling;
 if(scope==='none')throw new HttpsError('permission-denied','Sin alcance de Inicio');
 const cc=unique(member.countries||member.paises||member.paisesAutorizados).map(v=>text(v,8).toUpperCase()).filter(v=>v==='GT'||v==='CO');
 if(!cc.length||country!=='TODOS'&&!cc.includes(country))throw new HttpsError('permission-denied','País no autorizado');
 const mapping=member.roleVisibleAdvisorIds&&typeof member.roleVisibleAdvisorIds==='object'&&!Array.isArray(member.roleVisibleAdvisorIds)?member.roleVisibleAdvisorIds:{};
 const rm=Object.keys(mapping).find(k=>norm(k)===role),explicitRoleTeam=rm!==undefined;
 if(explicitRoleTeam&&!Array.isArray(mapping[rm]))throw new HttpsError('permission-denied','Configuración de equipo por rol inválida');
 // Explicit per-role visibility replaces the global team and same-team inference.
 const teamIds=new Set(unique(explicitRoleTeam?mapping[rm]:member.teamAdvisorIds||member.equipoAsesorIds||member.asesoresEquipo));
 const own=text(member.advisorId||member.asesorId,160),team=text(member.teamId||member.equipoId,160);if(own)teamIds.add(own);
 const [as,gs]=await Promise.all([tenant.collection('data').doc('asesores').collection('items').get(),tenant.collection('data').doc('metas').collection('items').get()]);
 const goals=new Map(),globalGoals=new Map();
 gs.docs.forEach(d=>{
 const g=d.data()||{},id=text(g.asesorId||g.advisorId,160),type=norm(g.tipo),c=text(g.pais,8).toUpperCase()||(text(g.moneda,8).toUpperCase()==='GTQ'?'GT':text(g.moneda,8).toUpperCase()==='COP'?'CO':''),n=Number(g.valor);
 if(String(g.mes||g.periodo||'').slice(0,7)!==month||!['GT','CO'].includes(c)||!['nueva','renovada','recaudo','prima'].includes(type)||g.valor==null||g.valor===''||!Number.isFinite(n)||n<0)return;
 if(!id){
  if(scope!=='all'||(cc.length&&!cc.includes(c))||(country!=='TODOS'&&country!==c))return;
  const v=globalGoals.get(c)||{nueva:0,renovada:0,recaudo:0,prima:0,explicitPrima:false,explicitRecaudo:false};
  v[type]+=n;if(['prima','nueva','renovada'].includes(type))v.explicitPrima=true;if(type==='recaudo')v.explicitRecaudo=true;globalGoals.set(c,v);return;
 }
 if(!['nueva','renovada','recaudo','prima'].includes(type))return;
 const key=id+'|'+c,v=goals.get(key)||{nueva:0,renovada:0,recaudo:0,prima:0,produccion:0,explicit:false,explicitPrima:false};v[type]+=n;if(type==='prima')v.explicitPrima=true;v.produccion=v.explicitPrima?v.prima:v.nueva+v.renovada;v.explicit=true;goals.set(key,v);
 });
 const rows=[],seen=new Set();for(const d of as.docs){const raw=d.data()||{},a=project(d);if(!a.id||!a.nombre||seen.has(a.id))continue;if(scope==='own'&&a.id!==own)continue;if(scope==='team'&&!teamIds.has(a.id)&&(!team||explicitRoleTeam||text(raw.teamId||raw.equipoId,160)!==team))continue;
 const paises=a.paises.filter(c=>(c==='GT'||c==='CO')&&(!cc.length||cc.includes(c))&&(country==='TODOS'||country===c));if(!paises.length)continue;seen.add(a.id);
 const explicitPrimary=text(raw.paisPrincipal||raw.primaryCountry||raw.paisDefault||raw.countryDefault,8).toUpperCase();
 const primaryCountry=paises.includes(explicitPrimary)?explicitPrimary:(!explicitPrimary&&paises.length===1?paises[0]:'');
 const metas={};paises.forEach(c=>metas[c]=goals.get(a.id+'|'+c)||{nueva:0,renovada:0,recaudo:0,produccion:0,explicit:false});
 const legacy=Number(raw.metaPrima);rows.push({id:a.id,nombre:a.nombre,activo:a.activo,paises,primaryCountry,metas,metaPrima:Number.isFinite(legacy)&&legacy>0&&paises.length===1?legacy:null});
 }rows.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'})||a.id.localeCompare(b.id));
 const globalMetas={};for(const [c,g] of globalGoals)globalMetas[c]={prima:g.prima>0?g.prima:g.nueva+g.renovada,recaudo:g.recaudo,explicitPrima:g.explicitPrima,explicitRecaudo:g.explicitRecaudo};
 const ownSource=as.docs.find(d=>d.id===own),ownData=ownSource&&ownSource.data()||{};
 const claimedPrimary=text(member.paisPrincipal||member.primaryCountry||member.paisDefault||member.countryDefault,8).toUpperCase();
 const rosterPrimary=text(ownData.paisPrincipal||ownData.primaryCountry||ownData.paisDefault||ownData.countryDefault,8).toUpperCase();
 const primaryCandidate=claimedPrimary||rosterPrimary||(!claimedPrimary&&!rosterPrimary&&cc.length===1?cc[0]:'');
 const primaryCountry=cc.includes(primaryCandidate)?primaryCandidate:'';
 return{ok:true,schemaVersion:'gravicentra-inicio-r23',dashboardContract:DASHBOARD_CONTRACT,country,month,scope,rows,globalMetas,primaryCountry,ownAdvisorId:rows.some(r=>r.id===own)?own:''};
}

exports.orbit360AssignableAdvisorRoster=onCall({region:REGION,cors:true},execute);
exports.orbit360AssignableAdvisorRosterPreview=onCall({region:PREVIEW_REGION,cors:true},execute);
exports.__assignableAdvisorRoster=Object.freeze({VERSION,FULL,SELF});
